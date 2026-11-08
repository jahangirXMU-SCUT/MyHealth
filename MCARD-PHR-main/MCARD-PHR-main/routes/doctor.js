// ============================================================
// DOCTOR ROUTES
// ============================================================

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { query } = require("../db");

const router = express.Router();

const ROOT_DIR = path.join(__dirname, "..");
const DOCTOR_UPLOAD_DIR = path.join(ROOT_DIR, "uploads", "doctors");
if (!fs.existsSync(DOCTOR_UPLOAD_DIR)) fs.mkdirSync(DOCTOR_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, DOCTOR_UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + "_" + crypto.randomUUID() + ext);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only images allowed."));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

const cleanText = v => String(v || "").trim();
function toDateOnly(v) {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).slice(0, 10);
}

function requireDoctor(req, res, next) {
    if (!req.session.doctorId) {
        return res.status(403).json({ success: false, message: "Doctor access required." });
    }
    next();
}

router.use(requireDoctor);

// ------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------
router.get("/profile", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM doctors WHERE id = $1", [req.session.doctorId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const d = rows[0];
        res.json({
            success: true,
            doctor: {
                id: d.id, email: d.email, fullName: d.full_name, degree: d.degree,
                profession: d.profession, specialization: d.specialization,
                lastWorkedPlace: d.last_worked_place, experienceYears: d.experience_years,
                licenseNumber: d.license_number,
                consultationFee: d.consultation_fee != null ? parseFloat(d.consultation_fee) : null,
                bio: d.bio, profilePicture: d.profile_picture, status: d.status
            }
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/profile", upload.single("profilePicture"), async (req, res) => {
    try {
        const b = req.body;
        const updates = {};
        const map = {
            fullName: "full_name", degree: "degree", profession: "profession",
            specialization: "specialization", lastWorkedPlace: "last_worked_place",
            licenseNumber: "license_number", bio: "bio"
        };
        for (const [k, col] of Object.entries(map)) {
            if (b[k] !== undefined) updates[col] = cleanText(b[k]);
        }
        if (b.experienceYears !== undefined) updates.experience_years = parseInt(b.experienceYears, 10) || null;
        if (b.consultationFee !== undefined) updates.consultation_fee = parseFloat(b.consultationFee) || null;
        if (req.file) updates.profile_picture = "/uploads/doctors/" + req.file.filename;

        const keys = Object.keys(updates);
        if (keys.length > 0) {
            const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
            await query(
                `UPDATE doctors SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
                [...keys.map(k => updates[k]), req.session.doctorId]
            );
        }
        res.json({ success: true, message: "Profile updated." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// DASHBOARD STATS
// ------------------------------------------------------------
router.get("/stats", async (req, res) => {
    try {
        const dId = req.session.doctorId;
        const r = await query(`
            SELECT
              (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = 'requested')::int AS pending,
              (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = 'confirmed')::int AS confirmed,
              (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = 'completed')::int AS completed,
              (SELECT COUNT(DISTINCT user_id) FROM appointments WHERE doctor_id = $1)::int AS patients,
              (SELECT COUNT(*) FROM doctor_notifications WHERE doctor_id = $1 AND is_read = FALSE)::int AS unread
        `, [dId]);
        res.json({ success: true, stats: r.rows[0] });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// NOTIFICATIONS
// ------------------------------------------------------------
router.get("/notifications", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT n.*, a.doctor_name, u.full_name AS patient_name
             FROM doctor_notifications n
             LEFT JOIN appointments a ON a.id = n.appointment_id
             LEFT JOIN users u ON u.id = a.user_id
             WHERE n.doctor_id = $1
             ORDER BY n.created_at DESC LIMIT 50`,
            [req.session.doctorId]
        );
        res.json({ success: true, notifications: rows });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/notifications/:id/read", async (req, res) => {
    try {
        await query(
            "UPDATE doctor_notifications SET is_read = TRUE WHERE id = $1 AND doctor_id = $2",
            [req.params.id, req.session.doctorId]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// APPOINTMENT REQUESTS
// ------------------------------------------------------------
router.get("/requests", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT a.*, u.full_name AS patient_name, u.mobile AS patient_mobile,
                    u.email AS patient_email, u.date_of_birth,
                    u.allergies, u.diseases, u.emergency_contact_name, u.emergency_contact_number
             FROM appointments a
             JOIN users u ON u.id = a.user_id
             WHERE a.doctor_id = $1 AND a.status = 'requested'
             ORDER BY a.requested_at DESC`,
            [req.session.doctorId]
        );
        res.json({
            success: true,
            requests: rows.map(r => ({
                id: r.id, patientId: r.user_id, patientName: r.patient_name,
                patientMobile: r.patient_mobile, patientEmail: r.patient_email,
                dateOfBirth: toDateOnly(r.date_of_birth),
                allergies: r.allergies, diseases: r.diseases,
                emergencyContact: `${r.emergency_contact_name || ""} ${r.emergency_contact_number || ""}`.trim(),
                requestedDate: toDateOnly(r.appointment_date),
                requestedTime: r.appointment_time,
                reason: r.reason, status: r.status,
                requestedAt: r.requested_at
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/requests/:id/accept", async (req, res) => {
    try {
        const { time, date, feedback } = req.body;
        const { rows } = await query(
            "SELECT * FROM appointments WHERE id = $1 AND doctor_id = $2 AND status = 'requested'",
            [req.params.id, req.session.doctorId]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Request not found." });

        const newDate = date || rows[0].appointment_date;
        const newTime = time || rows[0].appointment_time;

        await query(
            `UPDATE appointments SET status = 'confirmed', appointment_date = $1,
             appointment_time = $2, proposed_time = $3, doctor_feedback = $4,
             responded_at = NOW() WHERE id = $5`,
            [newDate, newTime, newTime, cleanText(feedback) || null, req.params.id]
        );

        // Add to patient's doctor history
        const d = await query("SELECT * FROM doctors WHERE id = $1", [req.session.doctorId]);
        const doctor = d.rows[0];
        await query(
            `INSERT INTO patient_doctor_history
             (user_id, doctor_id, doctor_name, degree, profession, specialization,
              last_worked_place, visit_date, appointment_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [rows[0].user_id, doctor.id, doctor.full_name, doctor.degree,
             doctor.profession, doctor.specialization, doctor.last_worked_place,
             newDate, rows[0].id]
        );

        res.json({ success: true, message: "Appointment confirmed." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/requests/:id/reject", async (req, res) => {
    try {
        const { feedback } = req.body;
        const r = await query(
            `UPDATE appointments SET status = 'rejected', doctor_feedback = $1,
             responded_at = NOW() WHERE id = $2 AND doctor_id = $3 AND status = 'requested'`,
            [cleanText(feedback) || null, req.params.id, req.session.doctorId]
        );
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Request not found." });
        res.json({ success: true, message: "Request rejected." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// SCHEDULE (confirmed appointments)
// ------------------------------------------------------------
router.get("/schedule", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT a.*, u.full_name AS patient_name, u.mobile AS patient_mobile
             FROM appointments a
             JOIN users u ON u.id = a.user_id
             WHERE a.doctor_id = $1 AND a.status IN ('confirmed','completed')
             ORDER BY a.appointment_date DESC`,
            [req.session.doctorId]
        );
        res.json({
            success: true,
            schedule: rows.map(r => ({
                id: r.id, patientId: r.user_id, patientName: r.patient_name,
                patientMobile: r.patient_mobile,
                date: toDateOnly(r.appointment_date), time: r.appointment_time,
                status: r.status, notes: r.notes, reason: r.reason
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// MY PATIENTS
// ------------------------------------------------------------
router.get("/patients", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT DISTINCT ON (u.id) u.id, u.full_name, u.mobile, u.email,
                    u.date_of_birth, u.blood_group, u.allergies, u.diseases,
                    u.profile_picture,
                    (SELECT MAX(appointment_date) FROM appointments
                     WHERE doctor_id = $1 AND user_id = u.id) AS last_visit
             FROM users u
             JOIN appointments a ON a.user_id = u.id
             WHERE a.doctor_id = $1
             ORDER BY u.id, last_visit DESC`,
            [req.session.doctorId]
        );
        res.json({
            success: true,
            patients: rows.map(r => ({
                id: r.id, fullName: r.full_name, mobile: r.mobile, email: r.email,
                dateOfBirth: toDateOnly(r.date_of_birth), bloodGroup: r.blood_group,
                allergies: r.allergies, diseases: r.diseases,
                profilePicture: r.profile_picture,
                lastVisit: toDateOnly(r.last_visit)
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/patients/:id", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const u = rows[0];

        const { rows: history } = await query(
            `SELECT * FROM appointments WHERE user_id = $1 AND doctor_id = $2
             ORDER BY appointment_date DESC`,
            [u.id, req.session.doctorId]
        );

        const { rows: prescriptions } = await query(
            `SELECT * FROM patient_prescriptions WHERE user_id = $1 AND doctor_id = $2
             ORDER BY prescribed_at DESC`,
            [u.id, req.session.doctorId]
        );

        res.json({
            success: true,
            patient: {
                id: u.id, fullName: u.full_name, mobile: u.mobile, email: u.email,
                dateOfBirth: toDateOnly(u.date_of_birth), bloodGroup: u.blood_group,
                homeAddress: u.home_address, permanentAddress: u.permanent_address,
                diseases: u.diseases, allergies: u.allergies, otherDiseases: u.other_diseases,
                emergencyContactName: u.emergency_contact_name,
                emergencyContactNumber: u.emergency_contact_number,
                profilePicture: u.profile_picture
            },
            history: history.map(h => ({
                id: h.id, date: toDateOnly(h.appointment_date), time: h.appointment_time,
                status: h.status, notes: h.notes, reason: h.reason,
                feedback: h.doctor_feedback
            })),
            prescriptions: prescriptions.map(p => ({
                id: p.id, medicineName: p.medicine_name, dosage: p.dosage,
                durationDays: p.duration_days, notes: p.notes,
                prescribedAt: p.prescribed_at
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// WRITE PRESCRIPTION (adds to patient summary + doctor's own list)
// ------------------------------------------------------------
router.post("/patients/:id/prescriptions", async (req, res) => {
    try {
        const { medicineName, dosage, durationDays, notes } = req.body;
        if (!medicineName) return res.status(400).json({ success: false, message: "Medicine name required." });

        // Verify this patient has an appointment with this doctor
        const check = await query(
            "SELECT id FROM appointments WHERE user_id = $1 AND doctor_id = $2 LIMIT 1",
            [req.params.id, req.session.doctorId]
        );
        if (check.rows.length === 0) {
            return res.status(403).json({ success: false, message: "No appointment with this patient." });
        }

        const d = await query("SELECT full_name FROM doctors WHERE id = $1", [req.session.doctorId]);
        const doctorName = d.rows[0].full_name;

        const { rows } = await query(
            `INSERT INTO patient_prescriptions
             (user_id, doctor_id, doctor_name, medicine_name, dosage, duration_days, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            [req.params.id, req.session.doctorId, doctorName, cleanText(medicineName),
             cleanText(dosage), parseInt(durationDays, 10) || null, cleanText(notes) || null]
        );
        res.status(201).json({ success: true, message: "Prescription added.", id: rows[0].id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// CHANGE PASSWORD
// ------------------------------------------------------------
router.post("/change-password", async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Invalid passwords." });
        }
        const { rows } = await query("SELECT password_hash FROM doctors WHERE id = $1", [req.session.doctorId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const ok = await bcrypt.compare(oldPassword, rows[0].password_hash);
        if (!ok) return res.status(401).json({ success: false, message: "Old password incorrect." });
        const hash = await bcrypt.hash(newPassword, 12);
        await query("UPDATE doctors SET password_hash = $1 WHERE id = $2", [hash, req.session.doctorId]);
        res.json({ success: true, message: "Password updated." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;