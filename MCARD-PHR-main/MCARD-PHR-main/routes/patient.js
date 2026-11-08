// ============================================================
// PATIENT ROUTES
// ============================================================

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const archiver = require("archiver");

const { query } = require("../db");
const { getMcard } = require("../mcard");

const router = express.Router();

const ROOT_DIR = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const PROFILE_UPLOAD_DIR = path.join(UPLOAD_DIR, "profiles");
const REPORT_UPLOAD_DIR = path.join(UPLOAD_DIR, "reports");

[PROFILE_UPLOAD_DIR, REPORT_UPLOAD_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif"];
function makeStorage(dest) {
    return multer.diskStorage({
        destination: (req, file, cb) => cb(null, dest),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, Date.now() + "_" + crypto.randomUUID() + ext);
        }
    });
}
function fileFilter(req, file, cb) {
    if (allowedMime.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only images allowed."));
}
const profileUpload = multer({ storage: makeStorage(PROFILE_UPLOAD_DIR), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const reportUpload = multer({
    storage: makeStorage(REPORT_UPLOAD_DIR),
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024, files: 30 }
});

const cleanText = v => String(v || "").trim();
const validPhone = p => /^[0-9+\-\s()]{7,20}$/.test(p);

function toDateOnly(v) {
    if (v == null) return null;
    if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, "0");
        const d = String(v.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    const s = String(v);
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : s;
}

function deleteUploadPath(uploadPath) {
    if (!uploadPath) return;
    const rel = uploadPath.replace(/^\/uploads[\/\\]/, "");
    const full = path.join(UPLOAD_DIR, rel);
    const r1 = path.resolve(UPLOAD_DIR), r2 = path.resolve(full);
    if (!r2.startsWith(r1 + path.sep)) return;
    try { if (fs.existsSync(r2)) fs.unlinkSync(r2); } catch (e) {}
}

// Middleware
function requirePatient(req, res, next) {
    if (!req.session.userId || req.session.adminId || req.session.doctorId || req.session.pharmacyId) {
        return res.status(403).json({ success: false, message: "Patient access required." });
    }
    next();
}

router.use(requirePatient);

// ------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------
router.get("/profile", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const u = rows[0];
        const mcard = await getMcard(u.id);
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
                mcardId: mcard ? mcard.mcard_id : null
            }
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/profile", profileUpload.single("profilePicture"), async (req, res) => {
    try {
        const cur = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
        if (cur.rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const u = cur.rows[0];
        const updates = {}, b = req.body;
        const map = {
            fullName: "full_name", homeAddress: "home_address",
            permanentAddress: "permanent_address", diseases: "diseases",
            allergies: "allergies", otherDiseases: "other_diseases",
            emergencyContactName: "emergency_contact_name",
            bloodGroup: "blood_group", dateOfBirth: "date_of_birth"
        };
        for (const [k, col] of Object.entries(map)) {
            if (b[k] !== undefined) updates[col] = cleanText(b[k]);
        }
        if (b.mobile) {
            if (!validPhone(b.mobile)) return res.status(400).json({ success: false, message: "Invalid mobile." });
            updates.mobile = cleanText(b.mobile);
        }
        if (b.emergencyContactNumber) {
            if (!validPhone(b.emergencyContactNumber)) return res.status(400).json({ success: false, message: "Invalid emergency number." });
            updates.emergency_contact_number = cleanText(b.emergencyContactNumber);
        }
        if (req.file) {
            if (u.profile_picture) deleteUploadPath(u.profile_picture);
            updates.profile_picture = "/uploads/profiles/" + req.file.filename;
        }
        const keys = Object.keys(updates);
        if (keys.length > 0) {
            const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
            await query(
                `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
                [...keys.map(k => updates[k]), req.session.userId]
            );
        }
        res.json({ success: true, message: "Profile updated." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------
async function loadReports(userId) {
    const { rows: reports } = await query(
        "SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC", [userId]
    );
    if (reports.length === 0) return [];
    const ids = reports.map(r => r.id);
    const { rows: images } = await query(
        "SELECT * FROM report_images WHERE report_id = ANY($1::uuid[])", [ids]
    );
    const by = new Map();
    images.forEach(i => {
        if (!by.has(i.report_id)) by.set(i.report_id, []);
        by.get(i.report_id).push(i);
    });
    return reports.map(r => {
        const imgs = by.get(r.id) || [];
        const pres = imgs.filter(i => i.image_type === "prescription").map(i => ({ filePath: i.file_path, originalFileName: i.original_filename }));
        const tests = imgs.filter(i => i.image_type === "test").map(i => ({ filePath: i.file_path, originalFileName: i.original_filename }));
        return {
            id: r.id, doctorName: r.doctor_name,
            appointmentDate: toDateOnly(r.appointment_date),
            testResults: r.test_results,
            prescriptionImages: pres, testReportImages: tests,
            filePath: pres[0]?.filePath || null,
            createdAt: r.created_at
        };
    });
}
// Patient's own lab results (for Summary tab)
router.get("/lab-results", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT lr.*, l.lab_name
             FROM lab_results lr
             JOIN labs l ON l.id = lr.lab_id
             WHERE lr.patient_id = $1
             ORDER BY lr.test_date DESC, lr.id DESC`,
            [req.session.userId]
        );
        res.json({ success: true, results: rows });
    } catch (err) {
        console.error("lab-results:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
router.get("/reports", async (req, res) => {
    try {
        const reports = await loadReports(req.session.userId);
        res.json({ success: true, reports });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/reports", reportUpload.fields([
    { name: "prescriptionImages", maxCount: 10 },
    { name: "testReportImages", maxCount: 20 }
]), async (req, res) => {
    const pres = req.files?.prescriptionImages || [];
    const tests = req.files?.testReportImages || [];
    const cleanup = () => [...pres, ...tests].forEach(f => {
        try { fs.unlinkSync(path.join(REPORT_UPLOAD_DIR, f.filename)); } catch (e) {}
    });
    try {
        const { doctorName, appointmentDate, testResults } = req.body;
        if (!doctorName || !appointmentDate) { cleanup(); return res.status(400).json({ success: false, message: "Doctor name and date required." }); }
        if (pres.length === 0) { cleanup(); return res.status(400).json({ success: false, message: "At least one prescription image required." }); }

        const { rows } = await query(
            `INSERT INTO reports (user_id, doctor_name, appointment_date, test_results)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [req.session.userId, cleanText(doctorName), appointmentDate, cleanText(testResults)]
        );
        const report = rows[0];
        let order = 0;
        for (const f of pres) {
            await query(
                `INSERT INTO report_images (report_id, file_path, original_filename, image_type, sort_order)
                 VALUES ($1,$2,$3,'prescription',$4)`,
                [report.id, "/uploads/reports/" + f.filename, f.originalname, order++]
            );
        }
        order = 0;
        for (const f of tests) {
            await query(
                `INSERT INTO report_images (report_id, file_path, original_filename, image_type, sort_order)
                 VALUES ($1,$2,$3,'test',$4)`,
                [report.id, "/uploads/reports/" + f.filename, f.originalname, order++]
            );
        }
        res.status(201).json({ success: true, message: "Report added." });
    } catch (err) {
        console.error("Add report error:", err);
        cleanup();
        res.status(500).json({ success: false, message: "Could not add report." });
    }
});

router.delete("/reports/:id", async (req, res) => {
    try {
        const { rows } = await query(
            "SELECT * FROM reports WHERE id = $1 AND user_id = $2",
            [req.params.id, req.session.userId]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const { rows: imgs } = await query("SELECT * FROM report_images WHERE report_id = $1", [req.params.id]);
        imgs.forEach(i => deleteUploadPath(i.file_path));
        await query("DELETE FROM reports WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "Report deleted." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// APPOINTMENTS (patient view)
// ------------------------------------------------------------
router.get("/appointments", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT * FROM appointments WHERE user_id = $1 ORDER BY appointment_date ASC`,
            [req.session.userId]
        );
        const appointments = rows.map(r => ({
            id: r.id, doctorId: r.doctor_id, doctorName: r.doctor_name,
            location: r.location, date: toDateOnly(r.appointment_date),
            time: r.appointment_time, notes: r.notes, reason: r.reason,
            status: r.status, doctorFeedback: r.doctor_feedback,
            proposedTime: r.proposed_time,
            latitude: r.latitude != null ? parseFloat(r.latitude) : null,
            longitude: r.longitude != null ? parseFloat(r.longitude) : null,
            doctorPhotoUrl: r.doctor_photo_url,
            createdAt: r.created_at
        }));
        res.json({ success: true, appointments });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Personal reminder (no doctor)
router.post("/appointments", async (req, res) => {
    try {
        const { doctorName, location, date, time, notes, latitude, longitude, doctorPhotoUrl } = req.body;
        if (!doctorName || !date) return res.status(400).json({ success: false, message: "Doctor name and date required." });
        const lat = latitude != null && latitude !== "" ? parseFloat(latitude) : null;
        const lng = longitude != null && longitude !== "" ? parseFloat(longitude) : null;
        const { rows } = await query(
            `INSERT INTO appointments
             (user_id, doctor_id, doctor_name, location, appointment_date,
              appointment_time, notes, latitude, longitude, doctor_photo_url, status)
             VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
             RETURNING id`,
            [req.session.userId, cleanText(doctorName), cleanText(location), date,
             cleanText(time), cleanText(notes), lat, lng, cleanText(doctorPhotoUrl) || null]
        );
        res.status(201).json({ success: true, message: "Reminder added.", id: rows[0].id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Request an appointment with a real doctor (creates notification)
router.post("/appointments/request", async (req, res) => {
    try {
        const { doctorId, date, time, reason } = req.body;
        if (!doctorId || !date) return res.status(400).json({ success: false, message: "Doctor and date required." });

        const dr = await query(
            "SELECT id, full_name, specialization, profile_picture, status FROM doctors WHERE id = $1",
            [doctorId]
        );
        if (dr.rows.length === 0 || dr.rows[0].status !== "approved") {
            return res.status(404).json({ success: false, message: "Doctor unavailable." });
        }
        const doctor = dr.rows[0];

        const { rows } = await query(
            `INSERT INTO appointments
             (user_id, doctor_id, doctor_name, appointment_date, appointment_time,
              reason, status, doctor_photo_url)
             VALUES ($1,$2,$3,$4,$5,$6,'requested',$7)
             RETURNING id`,
            [req.session.userId, doctor.id, doctor.full_name, date,
             cleanText(time), cleanText(reason), doctor.profile_picture]
        );

        await query(
            `INSERT INTO doctor_notifications (doctor_id, appointment_id, type, message)
             VALUES ($1, $2, 'new_request', $3)`,
            [doctor.id, rows[0].id, "New appointment request"]
        );

        res.status(201).json({ success: true, message: "Request sent to doctor.", id: rows[0].id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/appointments/:id", async (req, res) => {
    try {
        const result = await query(
            "DELETE FROM appointments WHERE id = $1 AND user_id = $2",
            [req.params.id, req.session.userId]
        );
        if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "Appointment deleted." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// MEDICINES
// ------------------------------------------------------------
router.get("/medicines", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT * FROM medicines WHERE user_id = $1
             ORDER BY is_active DESC, start_date DESC, created_at DESC`,
            [req.session.userId]
        );
        if (rows.length === 0) return res.json({ success: true, medicines: [] });

        const ids = rows.map(m => m.id);
        const intakes = await query(
            "SELECT * FROM medicine_intakes WHERE medicine_id = ANY($1::uuid[])", [ids]
        );
        const by = new Map();
        intakes.rows.forEach(i => {
            if (!by.has(i.medicine_id)) by.set(i.medicine_id, []);
            by.get(i.medicine_id).push(i);
        });

        const today = new Date().toISOString().split("T")[0];

        const medicines = rows.map(m => {
            const medIntakes = by.get(m.id) || [];
            const totalPerDay = (m.dosage_morning || 0) + (m.dosage_noon || 0) + (m.dosage_night || 0);
            const totalPills = totalPerDay * m.duration_days;
            const takenBySlot = { morning: 0, noon: 0, night: 0 };
            medIntakes.forEach(i => { if (takenBySlot[i.slot] != null) takenBySlot[i.slot]++; });
            const takenTotal =
                takenBySlot.morning * (m.dosage_morning || 0) +
                takenBySlot.noon * (m.dosage_noon || 0) +
                takenBySlot.night * (m.dosage_night || 0);
            const remainingTotal = Math.max(0, totalPills - takenTotal);

            const start = toDateOnly(m.start_date);
            const dayOffset = Math.floor((new Date(today + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000);
            const isForToday = m.is_active && dayOffset >= 0 && dayOffset < m.duration_days;

            const todaySlots = medIntakes
                .filter(i => toDateOnly(i.intake_date) === today)
                .map(i => i.slot);

            return {
                id: m.id, name: m.name,
                dosageMorning: m.dosage_morning, dosageNoon: m.dosage_noon, dosageNight: m.dosage_night,
                startDate: start, durationDays: m.duration_days, notes: m.notes,
                isActive: m.is_active, createdAt: m.created_at,
                totalPerDay, totalPills, takenTotal, remainingTotal,
                takenBySlot, isForToday, todaySlots, dayNumber: dayOffset + 1
            };
        });
        res.json({ success: true, medicines });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/medicines", async (req, res) => {
    try {
        const { name, dosageMorning, dosageNoon, dosageNight, startDate, durationDays, notes } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: "Name required." });
        const m = parseInt(dosageMorning, 10) || 0;
        const n = parseInt(dosageNoon, 10) || 0;
        const g = parseInt(dosageNight, 10) || 0;
        if (m + n + g === 0) return res.status(400).json({ success: false, message: "At least one dosage required." });
        const days = parseInt(durationDays, 10);
        if (!days || days <= 0 || days > 365) return res.status(400).json({ success: false, message: "Duration 1-365." });
        const start = startDate ? String(startDate) : new Date().toISOString().split("T")[0];
        const { rows } = await query(
            `INSERT INTO medicines (user_id, name, dosage_morning, dosage_noon, dosage_night,
             start_date, duration_days, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [req.session.userId, cleanText(name), m, n, g, start, days, cleanText(notes) || null]
        );
        res.status(201).json({ success: true, message: "Medicine added.", id: rows[0].id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/medicines/:id", async (req, res) => {
    try {
        const r = await query("DELETE FROM medicines WHERE id = $1 AND user_id = $2", [req.params.id, req.session.userId]);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "Deleted." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/medicines/:id/toggle", async (req, res) => {
    try {
        const { date, slot, taken } = req.body;
        if (!date || !slot || !["morning", "noon", "night"].includes(slot)) {
            return res.status(400).json({ success: false, message: "Invalid payload." });
        }
        const med = await query("SELECT id FROM medicines WHERE id = $1 AND user_id = $2", [req.params.id, req.session.userId]);
        if (med.rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });

        if (taken) {
            await query(
                `INSERT INTO medicine_intakes (medicine_id, user_id, intake_date, slot)
                 VALUES ($1,$2,$3,$4) ON CONFLICT (medicine_id, intake_date, slot) DO NOTHING`,
                [req.params.id, req.session.userId, date, slot]
            );
        } else {
            await query(
                `DELETE FROM medicine_intakes WHERE medicine_id = $1 AND user_id = $2
                 AND intake_date = $3 AND slot = $4`,
                [req.params.id, req.session.userId, date, slot]
            );
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/medicines/today", async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];
        const { rows } = await query(
            `SELECT * FROM medicines WHERE user_id = $1 AND is_active = TRUE
             AND start_date <= $2
             AND (start_date + (duration_days - 1) * INTERVAL '1 day')::date >= $2
             ORDER BY created_at DESC`,
            [req.session.userId, today]
        );
        if (rows.length === 0) return res.json({ success: true, today: [], date: today });

        const ids = rows.map(m => m.id);
        const intakes = await query(
            "SELECT * FROM medicine_intakes WHERE medicine_id = ANY($1::uuid[]) AND intake_date = $2",
            [ids, today]
        );
        const taken = new Map();
        intakes.rows.forEach(i => {
            if (!taken.has(i.medicine_id)) taken.set(i.medicine_id, new Set());
            taken.get(i.medicine_id).add(i.slot);
        });

        const list = rows.map(m => {
            const start = toDateOnly(m.start_date);
            const dayNum = Math.floor((new Date(today + "T00:00:00") - new Date(start + "T00:00:00")) / 86400000) + 1;
            return {
                id: m.id, name: m.name,
                dosageMorning: m.dosage_morning, dosageNoon: m.dosage_noon, dosageNight: m.dosage_night,
                startDate: start, durationDays: m.duration_days,
                dayNumber: dayNum, takenSlots: Array.from(taken.get(m.id) || [])
            };
        });
        res.json({ success: true, today: list, date: today });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// METRICS
// ------------------------------------------------------------
const METRIC_TYPES = [
    "blood_pressure_systolic", "blood_pressure_diastolic", "blood_sugar",
    "weight", "heart_rate", "temperature", "oxygen_saturation"
];

router.get("/metrics", async (req, res) => {
    try {
        const { type, days } = req.query;
        const params = [req.session.userId];
        let sql = "SELECT * FROM health_metrics WHERE user_id = $1";
        if (type && METRIC_TYPES.includes(type)) { params.push(type); sql += ` AND metric_type = $${params.length}`; }
        if (days) {
            const n = parseInt(days, 10);
            if (!Number.isNaN(n) && n > 0) sql += ` AND measured_at >= NOW() - INTERVAL '${n} days'`;
        }
        sql += " ORDER BY measured_at ASC";
        const { rows } = await query(sql, params);
        res.json({
            success: true,
            metrics: rows.map(r => ({
                id: r.id, type: r.metric_type, value: parseFloat(r.value),
                unit: r.unit, measuredAt: r.measured_at, notes: r.notes
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/metrics", async (req, res) => {
    try {
        const { type, value, unit, measuredAt, notes } = req.body;
        if (!type || !METRIC_TYPES.includes(type)) return res.status(400).json({ success: false, message: "Invalid type." });
        const numeric = parseFloat(value);
        if (Number.isNaN(numeric)) return res.status(400).json({ success: false, message: "Invalid value." });
        const { rows } = await query(
            `INSERT INTO health_metrics (user_id, metric_type, value, unit, measured_at, notes)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [req.session.userId, type, numeric, cleanText(unit) || null,
             measuredAt ? new Date(measuredAt) : new Date(), cleanText(notes) || null]
        );
        res.status(201).json({ success: true, id: rows[0].id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/metrics/:id", async (req, res) => {
    try {
        const r = await query("DELETE FROM health_metrics WHERE id = $1 AND user_id = $2", [req.params.id, req.session.userId]);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// SUMMARY (visited doctors + prescribed medicines)
// ------------------------------------------------------------
router.get("/summary/doctors", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT * FROM patient_doctor_history WHERE user_id = $1 ORDER BY visit_date DESC NULLS LAST`,
            [req.session.userId]
        );
        res.json({
            success: true,
            doctors: rows.map(r => ({
                id: r.id, doctorId: r.doctor_id, doctorName: r.doctor_name,
                degree: r.degree, profession: r.profession,
                specialization: r.specialization, lastWorkedPlace: r.last_worked_place,
                visitDate: toDateOnly(r.visit_date), appointmentId: r.appointment_id
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/summary/prescriptions", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT * FROM patient_prescriptions WHERE user_id = $1 ORDER BY prescribed_at DESC`,
            [req.session.userId]
        );
        res.json({
            success: true,
            prescriptions: rows.map(r => ({
                id: r.id, doctorId: r.doctor_id, doctorName: r.doctor_name,
                medicineName: r.medicine_name, dosage: r.dosage,
                durationDays: r.duration_days, notes: r.notes,
                prescribedAt: r.prescribed_at
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get("/summary/pharmacy", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT dr.*, p.pharmacy_name
             FROM dispense_records dr
             JOIN pharmacies p ON p.id = dr.pharmacy_id
             WHERE dr.patient_id = $1
             ORDER BY dr.created_at DESC`,
            [req.session.userId]
        );
        res.json({ success: true, records: rows });
    } catch (err) {
        console.error("summary/pharmacy:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// ------------------------------------------------------------
// PROFILE COMPLETENESS
// ------------------------------------------------------------
router.get("/profile/completeness", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const u = rows[0];
        const fields = [
            { key: "full_name", label: "Full name", weight: 10 },
            { key: "mobile", label: "Mobile number", weight: 10 },
            { key: "email", label: "Email", weight: 10 },
            { key: "home_address", label: "Home address", weight: 10 },
            { key: "permanent_address", label: "Permanent address", weight: 5 },
            { key: "diseases", label: "Diseases", weight: 10 },
            { key: "allergies", label: "Allergies", weight: 10 },
            { key: "emergency_contact_name", label: "Emergency contact name", weight: 15 },
            { key: "emergency_contact_number", label: "Emergency contact number", weight: 15 },
            { key: "profile_picture", label: "Profile picture", weight: 5 }
        ];
        let score = 0;
        const missing = [];
        fields.forEach(f => {
            const v = u[f.key];
            if (v && String(v).trim()) score += f.weight;
            else missing.push(f.label);
        });
        const rep = await query("SELECT COUNT(*)::int AS c FROM reports WHERE user_id = $1", [req.session.userId]);
        if (rep.rows[0].c > 0) score = Math.min(100, score + 5);
        const percent = Math.min(100, score);
        if (percent < 100 && rep.rows[0].c === 0) missing.push("At least one medical report");
        res.json({ success: true, completeness: { percent, missing, total: 100 } });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// EXPORT ZIP
// ------------------------------------------------------------
router.get("/export", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const u = rows[0];
        const reports = await loadReports(u.id);
        const { rows: appts } = await query("SELECT * FROM appointments WHERE user_id = $1", [u.id]);
        const mcard = await getMcard(u.id);

        const stamp = new Date().toISOString().split("T")[0];
        const safe = (u.full_name || "user").replace(/\s+/g, "-");

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition",
            `attachment; filename="mcard-phr-export-${safe}-${stamp}.zip"`);

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.on("error", err => { console.error(err); res.status(500).end(); });
        archive.pipe(res);

        const safeProfile = {
            fullName: u.full_name, email: u.email, mobile: u.mobile,
            dateOfBirth: toDateOnly(u.date_of_birth), bloodGroup: u.blood_group,
            homeAddress: u.home_address, permanentAddress: u.permanent_address,
            diseases: u.diseases, allergies: u.allergies, otherDiseases: u.other_diseases,
            emergencyContactName: u.emergency_contact_name,
            emergencyContactNumber: u.emergency_contact_number,
            mcardId: mcard ? mcard.mcard_id : null
        };
        archive.append(JSON.stringify(safeProfile, null, 2), { name: "profile.json" });
        archive.append(JSON.stringify(reports, null, 2), { name: "reports.json" });
        archive.append(JSON.stringify(appts, null, 2), { name: "appointments.json" });

        reports.forEach((rep, i) => {
            const folder = `reports/report-${i + 1}`;
            (rep.prescriptionImages || []).forEach((img, k) => {
                const fp = path.join(UPLOAD_DIR, img.filePath.replace(/^\/uploads[\/\\]/, ""));
                if (fs.existsSync(fp)) archive.file(fp, { name: `${folder}/prescription-${k + 1}${path.extname(fp)}` });
            });
            (rep.testReportImages || []).forEach((img, k) => {
                const fp = path.join(UPLOAD_DIR, img.filePath.replace(/^\/uploads[\/\\]/, ""));
                if (fs.existsSync(fp)) archive.file(fp, { name: `${folder}/test-${k + 1}${path.extname(fp)}` });
            });
        });

        archive.finalize();
    } catch (err) {
        console.error("Export error:", err);
        if (!res.headersSent) res.status(500).json({ success: false, message: "Export failed." });
    }
});

// ------------------------------------------------------------
// DELETE MY ACCOUNT
// ------------------------------------------------------------
router.delete("/account", async (req, res) => {
    try {
        const { rows } = await query("SELECT profile_picture FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        if (rows[0].profile_picture) deleteUploadPath(rows[0].profile_picture);
        const reports = await loadReports(req.session.userId);
        reports.forEach(r => {
            (r.prescriptionImages || []).forEach(i => deleteUploadPath(i.filePath));
            (r.testReportImages || []).forEach(i => deleteUploadPath(i.filePath));
        });
        await query("DELETE FROM users WHERE id = $1", [req.session.userId]);
        req.session.destroy(() => {});
        res.json({ success: true, message: "Account deleted." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// PRINT REPORT VIEW
// ------------------------------------------------------------
router.get("/print/report/:id", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) return res.status(404).send("Not found.");
        const u = rows[0];
        const reports = await loadReports(u.id);
        const report = reports.find(r => r.id === req.params.id);
        if (!report) return res.status(404).send("Report not found.");

        const esc = v => String(v || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

        res.send(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Report — ${esc(u.full_name)}</title>
<style>
  body{font-family:Arial;padding:40px;color:#17322a;max-width:900px;margin:auto}
  h1{color:#2E8B57} h2{color:#2E8B57;border-bottom:1px solid #ddd;padding-bottom:6px;margin-top:28px}
  .info{background:#F0FFF0;padding:20px;border-radius:12px;margin-bottom:24px}
  .row{margin-bottom:10px} .row b{display:inline-block;min-width:130px}
  img{max-width:100%;border:1px solid #ddd;border-radius:8px;margin-top:10px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .print-btn{float:right;padding:10px 18px;background:#2E8B57;color:#fff;border:none;border-radius:8px;cursor:pointer}
  .pre-wrap{white-space:pre-wrap}
</style></head><body>
<button onclick="window.print()" class="print-btn">Print</button>
<h1>♥ MCARD-PHR — Medical Report</h1>
<div class="info">
  <div class="row"><b>Patient:</b> ${esc(u.full_name)}</div>
  <div class="row"><b>Mobile:</b> ${esc(u.mobile)}</div>
  <div class="row"><b>Doctor:</b> ${esc(report.doctorName)}</div>
  <div class="row"><b>Date:</b> ${esc(report.appointmentDate)}</div>
</div>
${report.testResults ? `<h2>Test results</h2><p class="pre-wrap">${esc(report.testResults)}</p>` : ""}
${report.prescriptionImages.length ? `<h2>Prescriptions</h2><div class="grid">${report.prescriptionImages.map(i => `<img src="${esc(i.filePath)}">`).join("")}</div>` : ""}
${report.testReportImages.length ? `<h2>Test images</h2><div class="grid">${report.testReportImages.map(i => `<img src="${esc(i.filePath)}">`).join("")}</div>` : ""}
</body></html>`);
    } catch (err) { res.status(500).send("Error"); }
});

module.exports = router;