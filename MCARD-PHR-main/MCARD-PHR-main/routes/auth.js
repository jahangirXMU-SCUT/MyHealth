// ============================================================
// AUTH ROUTES — patient, doctor, pharmacy login/register/logout
// ============================================================

const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { query } = require("../db");
const { ensureMcard } = require("../mcard");

const router = express.Router();

const ROOT_DIR = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const PROFILE_UPLOAD_DIR = path.join(UPLOAD_DIR, "profiles");
const DOCTOR_UPLOAD_DIR = path.join(UPLOAD_DIR, "doctors");
const PHARMACY_UPLOAD_DIR = path.join(UPLOAD_DIR, "pharmacies");

[PROFILE_UPLOAD_DIR, DOCTOR_UPLOAD_DIR, PHARMACY_UPLOAD_DIR].forEach(d => {
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
    else cb(new Error("Only JPG, PNG, WEBP, GIF allowed."));
}

const profileUpload = multer({
    storage: makeStorage(PROFILE_UPLOAD_DIR),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
const doctorUpload = multer({
    storage: makeStorage(DOCTOR_UPLOAD_DIR),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
const pharmacyUpload = multer({
    storage: makeStorage(PHARMACY_UPLOAD_DIR),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const normalizeEmail = e => String(e || "").trim().toLowerCase();
const cleanText = v => String(v || "").trim();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const validPhone = p => /^[0-9+\-\s()]{7,20}$/.test(p);
const validPass = p => typeof p === "string" && p.length >= 6;

// ------------------------------------------------------------
// SESSION ME (used by frontend to know who is logged in)
// ------------------------------------------------------------
router.get("/me", async (req, res) => {
    try {
        if (req.session.adminId) {
            const { rows } = await query(
                "SELECT id, username, full_name, is_super FROM admins WHERE id = $1",
                [req.session.adminId]
            );
            if (rows.length === 0) {
                req.session.destroy(() => {});
                return res.json({ success: true, loggedIn: false });
            }
            return res.json({
                success: true, loggedIn: true, isAdmin: true, role: "admin",
                user: {
                    id: rows[0].id,
                    username: rows[0].username,
                    fullName: rows[0].full_name,
                    isAdmin: true,
                    isSuper: rows[0].is_super,
                    role: "admin"
                }
            });
        }

        if (req.session.doctorId) {
            const { rows } = await query(
                "SELECT id, username, full_name, email, profession, profile_picture, status FROM doctors WHERE id = $1",
                [req.session.doctorId]
            );
            if (rows.length === 0 || rows[0].status !== "approved") {
                req.session.destroy(() => {});
                return res.json({ success: true, loggedIn: false });
            }
            return res.json({
                success: true, loggedIn: true, isDoctor: true, role: "doctor",
                user: {
                    id: rows[0].id,
                    username: rows[0].username,
                    fullName: rows[0].full_name,
                    email: rows[0].email,
                    profession: rows[0].profession,
                    profilePicture: rows[0].profile_picture,
                    role: "doctor"
                }
            });
        }

        if (req.session.pharmacyId) {
            const { rows } = await query(
                "SELECT id, username, pharmacy_name, email, phone, profile_picture IS NULL AS no_pic FROM pharmacies WHERE id = $1",
                [req.session.pharmacyId]
            );
            const { rows: full } = await query(
                "SELECT id, username, pharmacy_name, email, phone, license_number, address, status FROM pharmacies WHERE id = $1",
                [req.session.pharmacyId]
            );
            if (full.length === 0 || full[0].status !== "approved") {
                req.session.destroy(() => {});
                return res.json({ success: true, loggedIn: false });
            }
            return res.json({
                success: true, loggedIn: true, isPharmacy: true, role: "pharmacy",
                user: {
                    id: full[0].id,
                    username: full[0].username,
                    fullName: full[0].pharmacy_name,
                    email: full[0].email,
                    phone: full[0].phone,
                    licenseNumber: full[0].license_number,
                    address: full[0].address,
                    role: "pharmacy"
                }
            });
        }

        if (!req.session.userId) {
            return res.json({ success: true, loggedIn: false });
        }

        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) {
            req.session.destroy(() => {});
            return res.json({ success: true, loggedIn: false });
        }

        const u = rows[0];
        const mcard = await ensureMcard(u.id, u.date_of_birth, u.mobile);

        res.json({
            success: true, loggedIn: true, isAdmin: false, role: "patient",
            user: {
                id: u.id,
                fullName: u.full_name,
                mobile: u.mobile,
                email: u.email,
                dateOfBirth: u.date_of_birth,
                bloodGroup: u.blood_group,
                homeAddress: u.home_address,
                permanentAddress: u.permanent_address,
                diseases: u.diseases,
                allergies: u.allergies,
                otherDiseases: u.other_diseases,
                emergencyContactName: u.emergency_contact_name,
                emergencyContactNumber: u.emergency_contact_number,
                profilePicture: u.profile_picture,
                status: u.status,
                mcardId: mcard ? mcard.mcard_id : null,
                isAdmin: false,
                role: "patient"
            }
        });
    } catch (err) {
        console.error("Session error:", err);
        res.status(500).json({ success: false, message: "Session error." });
    }
});

// ------------------------------------------------------------
// PATIENT REGISTER
// ------------------------------------------------------------
router.post("/register", profileUpload.single("profilePicture"), async (req, res) => {
    try {
        const {
            fullName, mobile, email, dateOfBirth, bloodGroup,
            homeAddress, permanentAddress, diseases,
            allergies, otherDiseases,
            emergencyContactName, emergencyContactNumber,
            password
        } = req.body;

        if (!fullName || !mobile || !email || !dateOfBirth || !password ||
            !emergencyContactName || !emergencyContactNumber) {
            return res.status(400).json({ success: false, message: "Please fill in all required fields." });
        }

        const ne = normalizeEmail(email);
        if (!validEmail(ne)) return res.status(400).json({ success: false, message: "Invalid email." });
        if (!validPhone(mobile)) return res.status(400).json({ success: false, message: "Invalid mobile." });
        if (!validPhone(emergencyContactNumber)) return res.status(400).json({ success: false, message: "Invalid emergency number." });
        if (!validPass(password)) return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });

        const existing = await query("SELECT id FROM users WHERE email = $1", [ne]);
        if (existing.rows.length > 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(409).json({ success: false, message: "Email already exists." });
        }

        const hash = await bcrypt.hash(password, 12);
        const pic = req.file ? "/uploads/profiles/" + req.file.filename : null;

        const { rows } = await query(
            `INSERT INTO users (
                full_name, mobile, email, date_of_birth, blood_group,
                home_address, permanent_address, diseases, allergies, other_diseases,
                emergency_contact_name, emergency_contact_number,
                password_hash, profile_picture, status
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
             RETURNING id`,
            [
                cleanText(fullName), cleanText(mobile), ne, dateOfBirth, cleanText(bloodGroup) || null,
                cleanText(homeAddress), cleanText(permanentAddress), cleanText(diseases),
                cleanText(allergies), cleanText(otherDiseases),
                cleanText(emergencyContactName), cleanText(emergencyContactNumber),
                hash, pic
            ]
        );

        res.status(201).json({
            success: true,
            message: "Registration successful. Awaiting admin approval.",
            userId: rows[0].id
        });
    } catch (err) {
        console.error("Register error:", err);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: "Registration failed." });
    }
});

// ------------------------------------------------------------
// DOCTOR REGISTER (self-signup → pending)
// ------------------------------------------------------------
router.post("/doctor/register", doctorUpload.single("profilePicture"), async (req, res) => {
    try {
        const {
            fullName, email, password, degree, profession, specialization,
            lastWorkedPlace, experienceYears, licenseNumber, consultationFee, bio
        } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, password required." });
        }
        const ne = normalizeEmail(email);
        if (!validEmail(ne)) return res.status(400).json({ success: false, message: "Invalid email." });
        if (!validPass(password)) return res.status(400).json({ success: false, message: "Password too short." });

        const exists = await query("SELECT id FROM doctors WHERE email = $1", [ne]);
        if (exists.rows.length > 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(409).json({ success: false, message: "Email already registered." });
        }

        const hash = await bcrypt.hash(password, 12);
        const pic = req.file ? "/uploads/doctors/" + req.file.filename : null;

        await query(
            `INSERT INTO doctors
             (email, password_hash, full_name, degree, profession, specialization,
              last_worked_place, experience_years, license_number, consultation_fee,
              bio, profile_picture, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')`,
            [
                ne, hash, cleanText(fullName), cleanText(degree), cleanText(profession),
                cleanText(specialization), cleanText(lastWorkedPlace),
                parseInt(experienceYears, 10) || null,
                cleanText(licenseNumber),
                parseFloat(consultationFee) || null,
                cleanText(bio), pic
            ]
        );

        res.status(201).json({ success: true, message: "Doctor registration submitted. Awaiting admin approval." });
    } catch (err) {
        console.error("Doctor register error:", err);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: "Registration failed." });
    }
});

// ------------------------------------------------------------
// PHARMACY REGISTER
// ------------------------------------------------------------
router.post("/pharmacy/register", pharmacyUpload.single("profilePicture"), async (req, res) => {
    try {
        const {
            pharmacyName, email, password, licenseNumber,
            address, phone, latitude, longitude
        } = req.body;

        if (!pharmacyName || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, password required." });
        }
        const ne = normalizeEmail(email);
        if (!validEmail(ne)) return res.status(400).json({ success: false, message: "Invalid email." });
        if (!validPass(password)) return res.status(400).json({ success: false, message: "Password too short." });

        const exists = await query("SELECT id FROM pharmacies WHERE email = $1", [ne]);
        if (exists.rows.length > 0) {
            return res.status(409).json({ success: false, message: "Email already registered." });
        }

        const hash = await bcrypt.hash(password, 12);

        await query(
            `INSERT INTO pharmacies
             (email, password_hash, pharmacy_name, license_number,
              address, phone, latitude, longitude, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
            [
                ne, hash, cleanText(pharmacyName), cleanText(licenseNumber),
                cleanText(address), cleanText(phone),
                latitude ? parseFloat(latitude) : null,
                longitude ? parseFloat(longitude) : null
            ]
        );

        res.status(201).json({ success: true, message: "Pharmacy registration submitted. Awaiting admin approval." });
    } catch (err) {
        console.error("Pharmacy register error:", err);
        res.status(500).json({ success: false, message: "Registration failed." });
    }
});

// ------------------------------------------------------------
// UNIFIED LOGIN — detects role automatically
// ------------------------------------------------------------
router.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required." });
        }
        const identifier = String(email).trim();
        const ne = normalizeEmail(identifier);

        // If a role was explicitly requested, honour it; otherwise try all.
        const tryAdmin = !role || role === "admin";
        const tryDoctor = !role || role === "doctor";
        const tryPharmacy = !role || role === "pharmacy";
        const tryPatient = !role || role === "patient";

        // ---- ADMIN ----
        if (tryAdmin) {
            const { rows } = await query(
                "SELECT * FROM admins WHERE username = $1 AND is_active = TRUE",
                [identifier]
            );
            if (rows.length > 0) {
                const ok = await bcrypt.compare(password, rows[0].password_hash);
                if (ok) {
                    req.session.adminId = rows[0].id;
                    req.session.userId = null;
                    req.session.doctorId = null;
                    req.session.pharmacyId = null;
                    await query("UPDATE admins SET last_login_at = NOW() WHERE id = $1", [rows[0].id]);
                    return res.json({
                        success: true, role: "admin", message: "Admin login successful.",
                        user: {
                            id: rows[0].id, username: rows[0].username,
                            fullName: rows[0].full_name, isAdmin: true,
                            isSuper: rows[0].is_super, role: "admin"
                        }
                    });
                }
            }
        }

        // ---- DOCTOR ----
        if (tryDoctor) {
            const { rows } = await query(
                "SELECT * FROM doctors WHERE LOWER(email) = $1 AND is_active = TRUE",
                [ne]
            );
            if (rows.length > 0) {
                const ok = await bcrypt.compare(password, rows[0].password_hash);
                if (ok) {
                    if (rows[0].status !== "approved") {
                        return res.status(403).json({ success: false, message: "Doctor account awaiting approval." });
                    }
                    req.session.doctorId = rows[0].id;
                    req.session.userId = null;
                    req.session.adminId = null;
                    req.session.pharmacyId = null;
                    await query("UPDATE doctors SET last_login_at = NOW() WHERE id = $1", [rows[0].id]);
                    return res.json({
                        success: true, role: "doctor", message: "Doctor login successful.",
                        user: {
                            id: rows[0].id, email: rows[0].email, fullName: rows[0].full_name,
                            profession: rows[0].profession, profilePicture: rows[0].profile_picture,
                            role: "doctor"
                        }
                    });
                }
            }
        }

        // ---- PHARMACY ----
        if (tryPharmacy) {
            const { rows } = await query(
                "SELECT * FROM pharmacies WHERE LOWER(email) = $1 AND is_active = TRUE",
                [ne]
            );
            if (rows.length > 0) {
                const ok = await bcrypt.compare(password, rows[0].password_hash);
                if (ok) {
                    if (rows[0].status !== "approved") {
                        return res.status(403).json({ success: false, message: "Pharmacy account awaiting approval." });
                    }
                    req.session.pharmacyId = rows[0].id;
                    req.session.userId = null;
                    req.session.adminId = null;
                    req.session.doctorId = null;
                    await query("UPDATE pharmacies SET last_login_at = NOW() WHERE id = $1", [rows[0].id]);
                    return res.json({
                        success: true, role: "pharmacy", message: "Pharmacy login successful.",
                        user: {
                            id: rows[0].id, email: rows[0].email,
                            fullName: rows[0].pharmacy_name, phone: rows[0].phone,
                            role: "pharmacy"
                        }
                    });
                }
            }
        }

        // ---- PATIENT ----
        if (tryPatient) {
            const phoneDigits = identifier.replace(/[\s\-()]/g, "");
            const { rows } = await query(
                `SELECT * FROM users
                 WHERE LOWER(email) = $1
                    OR REPLACE(REPLACE(REPLACE(mobile,' ',''),'-',''),'(','') = $2
                 LIMIT 1`,
                [ne, phoneDigits]
            );
            if (rows.length > 0) {
                const ok = await bcrypt.compare(password, rows[0].password_hash);
                if (ok) {
                    if (rows[0].status !== "approved") {
                        return res.status(403).json({ success: false, message: "Account awaiting approval." });
                    }
                    req.session.userId = rows[0].id;
                    req.session.adminId = null;
                    req.session.doctorId = null;
                    req.session.pharmacyId = null;

                    const mcard = await ensureMcard(rows[0].id, rows[0].date_of_birth, rows[0].mobile);

                    return res.json({
                        success: true, role: "patient", message: "Login successful.",
                        user: {
                            id: rows[0].id, fullName: rows[0].full_name,
                            email: rows[0].email, mobile: rows[0].mobile,
                            mcardId: mcard ? mcard.mcard_id : null,
                            isAdmin: false, role: "patient"
                        }
                    });
                }
            }
        }

        return res.status(401).json({ success: false, message: "Invalid credentials." });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Login failed." });
    }
});

// ------------------------------------------------------------
// LAB
// ------------------------------------------------------------
function requireLab(req, res, next) {
    if (req.session && req.session.labId) return next();
    return res.status(401).json({ success: false, message: 'Lab login required' });
}
// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------
router.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false, message: "Logout failed." });
        res.clearCookie("mcardphr.sid");
        res.json({ success: true, message: "Logged out." });
    });
});

module.exports = {
    router,
    profileUpload,
    doctorUpload,
    pharmacyUpload
};