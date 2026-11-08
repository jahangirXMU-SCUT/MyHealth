// ============================================================
// PHARMACY ROUTES
// ============================================================

const express = require("express");
const bcrypt = require("bcryptjs");

const { query } = require("../db");
const { findByMcardId } = require("../mcard");

const router = express.Router();

const cleanText = v => String(v || "").trim();
const toDateOnly = v => (v == null ? null : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)));

function requirePharmacy(req, res, next) {
    if (!req.session.pharmacyId) {
        return res.status(403).json({ success: false, message: "Pharmacy access required." });
    }
    next();
}

router.use(requirePharmacy);

// ------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------
router.get("/profile", async (req, res) => {
    try {
        const { rows } = await query("SELECT * FROM pharmacies WHERE id = $1", [req.session.pharmacyId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const p = rows[0];
        res.json({
            success: true,
            pharmacy: {
                id: p.id, email: p.email, pharmacyName: p.pharmacy_name,
                licenseNumber: p.license_number, address: p.address,
                phone: p.phone,
                latitude: p.latitude != null ? parseFloat(p.latitude) : null,
                longitude: p.longitude != null ? parseFloat(p.longitude) : null,
                status: p.status
            }
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/profile", async (req, res) => {
    try {
        const b = req.body;
        const updates = {};
        const map = {
            pharmacyName: "pharmacy_name", licenseNumber: "license_number",
            address: "address", phone: "phone"
        };
        for (const [k, col] of Object.entries(map)) {
            if (b[k] !== undefined) updates[col] = cleanText(b[k]);
        }
        if (b.latitude !== undefined) updates.latitude = b.latitude ? parseFloat(b.latitude) : null;
        if (b.longitude !== undefined) updates.longitude = b.longitude ? parseFloat(b.longitude) : null;

        const keys = Object.keys(updates);
        if (keys.length > 0) {
            const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
            await query(
                `UPDATE pharmacies SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
                [...keys.map(k => updates[k]), req.session.pharmacyId]
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
        const r = await query(`
            SELECT
              (SELECT COUNT(*) FROM pharmacy_medicines WHERE pharmacy_id = $1)::int AS total_meds,
              (SELECT COUNT(*) FROM pharmacy_medicines WHERE pharmacy_id = $1 AND category = 'normal')::int AS normal_meds,
              (SELECT COUNT(*) FROM pharmacy_medicines WHERE pharmacy_id = $1 AND category = 'special')::int AS special_meds,
              (SELECT COUNT(*) FROM pharmacy_medicines WHERE pharmacy_id = $1 AND stock = 0)::int AS out_of_stock,
              (SELECT COUNT(*) FROM dispense_records WHERE pharmacy_id = $1)::int AS dispensed_total,
              (SELECT COUNT(*) FROM dispense_records WHERE pharmacy_id = $1 AND dispensed_at >= NOW() - INTERVAL '7 days')::int AS dispensed_week
        `, [req.session.pharmacyId]);
        res.json({ success: true, stats: r.rows[0] });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// INVENTORY
// ------------------------------------------------------------
router.get("/inventory", async (req, res) => {
    try {
        const { category, search } = req.query;
        const params = [req.session.pharmacyId];
        let sql = "SELECT * FROM pharmacy_medicines WHERE pharmacy_id = $1";
        if (category === "normal" || category === "special") {
            params.push(category);
            sql += ` AND category = $${params.length}`;
        }
        if (search && String(search).trim()) {
            params.push("%" + String(search).trim().toLowerCase() + "%");
            sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(generic_name,'')) LIKE $${params.length})`;
        }
        sql += " ORDER BY category ASC, name ASC";

        const { rows } = await query(sql, params);
        res.json({
            success: true,
            medicines: rows.map(r => ({
                id: r.id, name: r.name, genericName: r.generic_name,
                category: r.category, manufacturer: r.manufacturer,
                strength: r.strength, form: r.form, stock: r.stock,
                price: r.price != null ? parseFloat(r.price) : null,
                isAvailable: r.is_available, createdAt: r.created_at
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post("/inventory", async (req, res) => {
    try {
        const { name, genericName, category, manufacturer, strength, form, stock, price } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: "Name required." });
        const cat = ["normal", "special"].includes(category) ? category : "normal";

        const { rows } = await query(
            `INSERT INTO pharmacy_medicines
             (pharmacy_id, name, generic_name, category, manufacturer, strength, form, stock, price)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [
                req.session.pharmacyId, cleanText(name), cleanText(genericName) || null,
                cat, cleanText(manufacturer) || null, cleanText(strength) || null,
                cleanText(form) || null,
                parseInt(stock, 10) || 0,
                price ? parseFloat(price) : null
            ]
        );
        res.status(201).json({ success: true, id: rows[0].id });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put("/inventory/:id", async (req, res) => {
    try {
        const b = req.body;
        const updates = {};
        if (b.name !== undefined) updates.name = cleanText(b.name);
        if (b.genericName !== undefined) updates.generic_name = cleanText(b.genericName) || null;
        if (b.category !== undefined && ["normal", "special"].includes(b.category)) updates.category = b.category;
        if (b.manufacturer !== undefined) updates.manufacturer = cleanText(b.manufacturer) || null;
        if (b.strength !== undefined) updates.strength = cleanText(b.strength) || null;
        if (b.form !== undefined) updates.form = cleanText(b.form) || null;
        if (b.stock !== undefined) updates.stock = Math.max(0, parseInt(b.stock, 10) || 0);
        if (b.price !== undefined) updates.price = b.price ? parseFloat(b.price) : null;
        if (b.isAvailable !== undefined) updates.is_available = !!b.isAvailable;

        const keys = Object.keys(updates);
        if (keys.length === 0) return res.status(400).json({ success: false, message: "No updates." });

        const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
        const r = await query(
            `UPDATE pharmacy_medicines SET ${sets}, updated_at = NOW()
             WHERE id = $${keys.length + 1} AND pharmacy_id = $${keys.length + 2}`,
            [...keys.map(k => updates[k]), req.params.id, req.session.pharmacyId]
        );
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "Updated." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete("/inventory/:id", async (req, res) => {
    try {
        const r = await query(
            "DELETE FROM pharmacy_medicines WHERE id = $1 AND pharmacy_id = $2",
            [req.params.id, req.session.pharmacyId]
        );
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json({ success: true, message: "Deleted." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// MEDICINE CATALOG (global suggestions)
// ------------------------------------------------------------
router.get("/catalog", async (req, res) => {
    try {
        const { search } = req.query;
        const params = [];
        let sql = "SELECT * FROM medicine_catalog";
        if (search && String(search).trim()) {
            params.push("%" + String(search).trim().toLowerCase() + "%");
            sql += ` WHERE LOWER(name) LIKE $1 OR LOWER(COALESCE(generic_name,'')) LIKE $1`;
        }
        sql += " ORDER BY name ASC LIMIT 100";
        const { rows } = await query(sql, params);
        res.json({
            success: true,
            catalog: rows.map(r => ({
                id: r.id, name: r.name, genericName: r.generic_name,
                strength: r.strength, form: r.form,
                manufacturer: r.manufacturer, isSpecial: r.is_special
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// SEARCH PATIENT BY MCARD ID
// ------------------------------------------------------------
router.get("/patient/:mcardId", async (req, res) => {
    try {
        const row = await findByMcardId(req.params.mcardId);
        if (!row) return res.status(404).json({ success: false, message: "No patient with this MCard ID." });

        const { rows: prescriptions } = await query(
            `SELECT pp.*, u.full_name AS patient_name
             FROM patient_prescriptions pp
             JOIN users u ON u.id = pp.user_id
             WHERE pp.user_id = $1
             ORDER BY pp.prescribed_at DESC`,
            [row.user_id]
        );

        res.json({
            success: true,
            patient: {
                userId: row.user_id,
                mcardId: row.mcard_id,
                fullName: row.full_name,
                mobile: row.mobile,
                email: row.email,
                bloodGroup: row.blood_group,
                allergies: row.allergies,
                diseases: row.diseases,
                emergencyContactName: row.emergency_contact_name,
                emergencyContactNumber: row.emergency_contact_number
            },
            prescriptions: prescriptions.map(p => ({
                id: p.id,
                doctorName: p.doctor_name,
                medicineName: p.medicine_name,
                dosage: p.dosage,
                durationDays: p.duration_days,
                notes: p.notes,
                prescribedAt: p.prescribed_at
            }))
        });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// DISPENSE
// ------------------------------------------------------------
router.post("/dispense", async (req, res) => {
    try {
        const {
            mcardId, prescriptionId, originalMedicine,
            dispensedMedicine, wasSubstituted, notDispensed, feedback
        } = req.body;

        if (!mcardId) return res.status(400).json({ success: false, message: "MCard ID required." });
        if (!notDispensed && !dispensedMedicine) {
            return res.status(400).json({ success: false, message: "Dispensed medicine required." });
        }
        if (notDispensed && !String(feedback || "").trim()) {
            return res.status(400).json({ success: false, message: "Please provide a reason for not dispensing." });
        }

        const pat = await findByMcardId(mcardId);
        const userId = pat ? pat.user_id : null;

        const { rows } = await query(
            `INSERT INTO dispense_records
             (pharmacy_id, user_id, mcard_id, prescription_id, original_medicine,
              dispensed_medicine, was_substituted, not_dispensed, feedback)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [
                req.session.pharmacyId, userId, cleanText(mcardId),
                prescriptionId || null,
                cleanText(originalMedicine) || null,
                cleanText(dispensedMedicine) || null,
                !!wasSubstituted, !!notDispensed,
                cleanText(feedback) || null
            ]
        );

        // Reduce stock if a real medicine was dispensed
        if (!notDispensed && dispensedMedicine) {
            await query(
                `UPDATE pharmacy_medicines SET stock = GREATEST(0, stock - 1)
                 WHERE pharmacy_id = $1 AND LOWER(name) = LOWER($2)`,
                [req.session.pharmacyId, cleanText(dispensedMedicine)]
            );
        }

        res.status(201).json({ success: true, id: rows[0].id, message: "Recorded." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ------------------------------------------------------------
// DISPENSE HISTORY
// ------------------------------------------------------------
router.get("/dispense-history", async (req, res) => {
    try {
        const { rows } = await query(
            `SELECT * FROM dispense_records WHERE pharmacy_id = $1
             ORDER BY dispensed_at DESC LIMIT 200`,
            [req.session.pharmacyId]
        );
        res.json({
            success: true,
            records: rows.map(r => ({
                id: r.id, mcardId: r.mcard_id, userId: r.user_id,
                originalMedicine: r.original_medicine,
                dispensedMedicine: r.dispensed_medicine,
                wasSubstituted: r.was_substituted,
                notDispensed: r.not_dispensed,
                feedback: r.feedback,
                dispensedAt: r.dispensed_at
            }))
        });
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
        const { rows } = await query("SELECT password_hash FROM pharmacies WHERE id = $1", [req.session.pharmacyId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        const ok = await bcrypt.compare(oldPassword, rows[0].password_hash);
        if (!ok) return res.status(401).json({ success: false, message: "Old password incorrect." });
        const hash = await bcrypt.hash(newPassword, 12);
        await query("UPDATE pharmacies SET password_hash = $1 WHERE id = $2", [hash, req.session.pharmacyId]);
        res.json({ success: true, message: "Password updated." });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;