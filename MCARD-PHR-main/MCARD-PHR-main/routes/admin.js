// ============================================================
// ADMIN ROUTES
// ============================================================

const express = require("express");
const path = require("path");
const fs = require("fs");

const { query } = require("../db");

const router = express.Router();

const ROOT_DIR = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");

const cleanText = v => String(v || "").trim();
const toDateOnly = v => (v == null ? null : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)));

function deleteUploadPath(uploadPath) {
    if (!uploadPath) return;
    const rel = uploadPath.replace(/^\/uploads[\/\\]/, "");
    const full = path.join(UPLOAD_DIR, rel);
    const r1 = path.resolve(UPLOAD_DIR), r2 = path.resolve(full);
    if (!r2.startsWith(r1 + path.sep)) return;
    try { if (fs.existsSync(r2)) fs.unlinkSync(r2); } catch (e) {}
}

function requireAdmin(req, res, next) {
    if (!req.session.adminId) {
        return res.status(403).json({ success: false, message: "Admin access required." });
    }
    next();
}

router.use(requireAdmin);

// ------------------------------------------------------------
// OVERVIEW STATS
// ------------------------------------------------------------
// List labs
router.get('/labs', requireAdmin, async (req, res) => {
    const { rows } = await db.query(
        `SELECT id, lab_name, email, phone, address, license_number, status, created_at
         FROM labs ORDER BY created_at DESC`
    );
    res.json({ success: true, labs: rows });
});

// Approve / reject / toggle / delete a lab
router.post('/labs/:id/:action', requireAdmin, async (req, res) => {
    const { id, action } = req.params;
    const map = {
        approve: `UPDATE labs SET status='approved' WHERE id=$1`,
        reject:  `UPDATE labs SET status='rejected' WHERE id=$1`,
        disable: `UPDATE labs SET status='disabled' WHERE id=$1`,
        enable:  `UPDATE labs SET status='approved' WHERE id=$1`,
        delete:  `DELETE FROM labs WHERE id=$1`
    };
    if (!map[action]) return res.status(400).json({ success: false, message: 'Unknown action' });
    await db.query(map[action], [id]);
    res.json({ success: true });
});
router.get("/stats", async (req, res) => {
    try {
        const r = await query(`
            SELECT
              (SELECT COUNT(*) FROM users)::int AS users_total,
              (SELECT COUNT(*) FROM users WHERE status = 'approved')::int AS users_approved,
              (SELECT COUNT(*) FROM users WHERE status = 'pending')::int AS users_pending,
              (SELECT COUNT(*) FROM users WHERE status = 'rejected')::int AS users_rejected,
              (SELECT COUNT(*) FROM doctors)::int AS doctors_total,
              (SELECT COUNT(*) FROM doctors WHERE status = 'approved')::int AS doctors_approved,
              (SELECT COUNT(*) FROM doctors WHERE status = 'pending')::int AS doctors_pending,
              (SELECT COUNT(*) FROM pharmacies)::int AS pharmacies_total,
              (SELECT COUNT(*) FROM pharmacies WHERE status = 'approved')::int AS pharmacies_approved,
              (SELECT COUNT(*) FROM pharmacies WHERE status = 'pending')::int AS pharmacies_pending,
              (SELECT COUNT(*) FROM appointments)::int AS appointments_total,
              (SELECT COUNT(*) FROM reports)::int AS reports_total,
              (SELECT COUNT(*) FROM dispense_records)::int AS dispense_total
        `);
        res.json({ success: true, stats: r.rows[0] });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================================
// USERS
// ============================================================
router.get("/users", async (req, res) => {
    try {
        const { rows } = await query(`
            SELECT u.*,
                (SELECT COUNT(*) FROM reports WHERE user_id = u.id)::int AS report_count,
                (SELECT COUNT(*) FROM appointments WHERE user_id = u.id)::int AS appointment_count,
                (SELECT mcard_id FROM mcards WHERE user_id = u.id) AS mcard_id
            FROM users u
            ORDER BY u.created_at DESC
        `);
        res.json({
            success: true,
            users: rows.map(u => ({
                id: u.id, fullName: u.full_name, mobile: u.mobile, email: u.email,
                status: u.status, createdAt: u.created_at, approvedAt: u.approved_at,
                profilePicture: u.profile_picture, mcardId: u.mcard_id,
                reportCount: u.report_count, appointmentCount: u.appointment_count
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/users/:id/approve", async (req, res) => {
    try {
        const r = await query(
            "UPDATE users SET status = 'approved', approved_at = NOW() WHERE id = $1",
            [req.params.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "User approved." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/users/:id/reject", async (req, res) => {
    try {
        const r = await query("UPDATE users SET status = 'rejected' WHERE id = $1", [req.params.id]);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "User rejected." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/users/:id/delete", async (req, res) => {
    try {
        const { rows } = await query("SELECT profile_picture FROM users WHERE id = $1", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        if (rows[0].profile_picture) deleteUploadPath(rows[0].profile_picture);

        const { rows: images } = await query(
            `SELECT ri.file_path FROM report_images ri
             JOIN reports r ON r.id = ri.report_id WHERE r.user_id = $1`,
            [req.params.id]
        );
        images.forEach(i => deleteUploadPath(i.file_path));

        await query("DELETE FROM users WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "User deleted." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/users/:id", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const u = rows[0];

        const { rows: mcard } = await query("SELECT mcard_id FROM mcards WHERE user_id = $1", [u.id]);
        const { rows: reports } = await query(
            "SELECT id, doctor_name, appointment_date FROM reports WHERE user_id = $1 ORDER BY appointment_date DESC",
            [u.id]
        );
        const { rows: appts } = await query(
            "SELECT id, doctor_name, appointment_date, status FROM appointments WHERE user_id = $1 ORDER BY appointment_date DESC",
            [u.id]
        );

        res.json({
            success: true,
            user: {
                id: u.id, fullName: u.full_name, mobile: u.mobile, email: u.email,
                dateOfBirth: toDateOnly(u.date_of_birth), bloodGroup: u.blood_group,
                homeAddress: u.home_address, permanentAddress: u.permanent_address,
                diseases: u.diseases, allergies: u.allergies, otherDiseases: u.other_diseases,
                emergencyContactName: u.emergency_contact_name,
                emergencyContactNumber: u.emergency_contact_number,
                profilePicture: u.profile_picture, status: u.status,
                createdAt: u.created_at, mcardId: mcard[0]?.mcard_id || null,
                reports: reports.map(r => ({
                    id: r.id, doctorName: r.doctor_name, appointmentDate: toDateOnly(r.appointment_date)
                })),
                appointments: appts.map(a => ({
                    id: a.id, doctorName: a.doctor_name,
                    date: toDateOnly(a.appointment_date), status: a.status
                }))
            }
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================================
// DOCTORS
// ============================================================
router.get("/doctors", async (req, res) => {
    try {
        const { rows } = await query(`
            SELECT d.*,
              (SELECT COUNT(DISTINCT user_id) FROM appointments WHERE doctor_id = d.id)::int AS patient_count
            FROM doctors d ORDER BY d.created_at DESC
        `);
        res.json({
            success: true,
            doctors: rows.map(d => ({
                id: d.id, fullName: d.full_name, email: d.email,
                degree: d.degree, profession: d.profession,
                specialization: d.specialization,
                lastWorkedPlace: d.last_worked_place,
                experienceYears: d.experience_years,
                licenseNumber: d.license_number,
                consultationFee: d.consultation_fee != null ? parseFloat(d.consultation_fee) : null,
                status: d.status, isActive: d.is_active,
                profilePicture: d.profile_picture,
                patientCount: d.patient_count,
                createdAt: d.created_at
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/doctors/:id/approve", async (req, res) => {
    try {
        const r = await query(
            "UPDATE doctors SET status = 'approved', approved_at = NOW() WHERE id = $1",
            [req.params.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "Doctor approved." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/doctors/:id/reject", async (req, res) => {
    try {
        const r = await query("UPDATE doctors SET status = 'rejected' WHERE id = $1", [req.params.id]);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "Doctor rejected." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/doctors/:id/toggle", async (req, res) => {
    try {
        const r = await query(
            "UPDATE doctors SET is_active = NOT is_active WHERE id = $1 RETURNING is_active",
            [req.params.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, isActive: r.rows[0].is_active });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/doctors/:id/delete", async (req, res) => {
    try {
        const { rows } = await query("SELECT profile_picture FROM doctors WHERE id = $1", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        if (rows[0].profile_picture) deleteUploadPath(rows[0].profile_picture);
        await query("DELETE FROM doctors WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "Doctor deleted." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ============================================================
// PHARMACIES
// ============================================================
router.get("/pharmacies", async (req, res) => {
    try {
        const { rows } = await query(`
            SELECT p.*,
              (SELECT COUNT(*) FROM pharmacy_medicines WHERE pharmacy_id = p.id)::int AS medicine_count,
              (SELECT COUNT(*) FROM dispense_records WHERE pharmacy_id = p.id)::int AS dispense_count
            FROM pharmacies p ORDER BY p.created_at DESC
        `);
        res.json({
            success: true,
            pharmacies: rows.map(p => ({
                id: p.id, pharmacyName: p.pharmacy_name, email: p.email,
                licenseNumber: p.license_number, address: p.address, phone: p.phone,
                status: p.status, isActive: p.is_active,
                medicineCount: p.medicine_count, dispenseCount: p.dispense_count,
                createdAt: p.created_at
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/pharmacies/:id/approve", async (req, res) => {
    try {
        const r = await query(
            "UPDATE pharmacies SET status = 'approved', approved_at = NOW() WHERE id = $1",
            [req.params.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "Pharmacy approved." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/pharmacies/:id/reject", async (req, res) => {
    try {
        const r = await query("UPDATE pharmacies SET status = 'rejected' WHERE id = $1", [req.params.id]);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "Pharmacy rejected." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/pharmacies/:id/toggle", async (req, res) => {
    try {
        const r = await query(
            "UPDATE pharmacies SET is_active = NOT is_active WHERE id = $1 RETURNING is_active",
            [req.params.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, isActive: r.rows[0].is_active });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/pharmacies/:id/delete", async (req, res) => {
    try {
        await query("DELETE FROM pharmacies WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "Pharmacy deleted." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;