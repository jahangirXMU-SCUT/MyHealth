// ============================================================
// PUBLIC API ROUTES (no login required)
// ============================================================

const express = require("express");
const { query } = require("../db");
const { findByMcardId } = require("../mcard");

const router = express.Router();

// List approved doctors (for patients to browse)
router.get("/doctors", async (req, res) => {
    try {
        const { search, specialization } = req.query;
        const params = [];
        let sql = `SELECT id, full_name, degree, profession, specialization,
                          last_worked_place, experience_years, consultation_fee,
                          bio, profile_picture
                   FROM doctors
                   WHERE status = 'approved' AND is_active = TRUE`;

        if (search && String(search).trim()) {
            params.push("%" + String(search).trim().toLowerCase() + "%");
            sql += ` AND (LOWER(full_name) LIKE $${params.length}
                    OR LOWER(COALESCE(specialization,'')) LIKE $${params.length}
                    OR LOWER(COALESCE(profession,'')) LIKE $${params.length})`;
        }
        if (specialization && String(specialization).trim()) {
            params.push("%" + String(specialization).trim().toLowerCase() + "%");
            sql += ` AND LOWER(COALESCE(specialization,'')) LIKE $${params.length}`;
        }
        sql += " ORDER BY full_name ASC";

        const { rows } = await query(sql, params);
        res.json({
            success: true,
            doctors: rows.map(d => ({
                id: d.id, fullName: d.full_name, degree: d.degree,
                profession: d.profession, specialization: d.specialization,
                lastWorkedPlace: d.last_worked_place,
                experienceYears: d.experience_years,
                consultationFee: d.consultation_fee != null ? parseFloat(d.consultation_fee) : null,
                bio: d.bio, profilePicture: d.profile_picture
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get("/doctors/:id", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT id, full_name, degree, profession, specialization,
                    last_worked_place, experience_years, consultation_fee,
                    bio, profile_picture
             FROM doctors WHERE id = $1 AND status = 'approved' AND is_active = TRUE`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Doctor not found." });
        const d = rows[0];
        res.json({
            success: true,
            doctor: {
                id: d.id, fullName: d.full_name, degree: d.degree,
                profession: d.profession, specialization: d.specialization,
                lastWorkedPlace: d.last_worked_place,
                experienceYears: d.experience_years,
                consultationFee: d.consultation_fee != null ? parseFloat(d.consultation_fee) : null,
                bio: d.bio, profilePicture: d.profile_picture
            }
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// MCard emergency preview (public)
router.get("/mcard/:mcardId", async (req, res) => {
    try {
        const row = await findByMcardId(req.params.mcardId);
        if (!row) return res.status(404).json({ success: false, message: "Not found." });
        res.json({
            success: true,
            card: {
                mcardId: row.mcard_id,
                fullName: row.full_name,
                bloodGroup: row.blood_group,
                emergencyContactName: row.emergency_contact_name,
                emergencyContactNumber: row.emergency_contact_number
            }
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;