const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
// Middleware: require an approved lab session
function requireLab(req, res, next) {
    if (!req.session || !req.session.labId) {
        return res.status(401).json({ success: false, message: 'Lab login required' });
    }
    next();
}
const router = express.Router();

/* ---------- Register ---------- */
router.post('/register', async (req, res) => {
    try {
        const { lab_name, email, phone, address, license_number, password } = req.body;
        if (!lab_name || !email || !password)
            return res.status(400).json({ success: false, message: 'Missing required fields' });

        const exists = await db.query('SELECT 1 FROM labs WHERE email = $1', [email]);
        if (exists.rowCount) return res.status(409).json({ success: false, message: 'Email already registered' });

        const hash = await bcrypt.hash(password, 12);
        await db.query(
            `INSERT INTO labs (lab_name, email, phone, address, license_number, password_hash, status)
             VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
            [lab_name, email, phone, address, license_number, hash]
        );
        res.json({ success: true, message: 'Registration submitted. Await admin approval.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ---------- Login ---------- */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { rows } = await db.query('SELECT * FROM labs WHERE email = $1', [email]);
        const lab = rows[0];
        if (!lab) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (lab.status !== 'approved')
            return res.status(403).json({ success: false, message: `Account ${lab.status}` });

        const ok = await bcrypt.compare(password, lab.password_hash);
        if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        req.session.labId = lab.id;
        req.session.role  = 'lab';
        req.session.save(err => {
            if (err) return res.status(500).json({ success: false, message: 'Session error' });
            res.json({ success: true, lab: { id: lab.id, name: lab.lab_name, email: lab.email } });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ---------- Search patient by MCard ID ---------- */
router.get('/patient/:mcardId', requireLab, async (req, res) => {
    try {
        const { mcardId } = req.params;
        const { rows } = await db.query(
            `SELECT u.id, u.full_name, u.mobile, u.date_of_birth, u.blood_group, u.gender,
                    m.mcard_id
             FROM mcards m
             JOIN users u ON u.id = m.user_id
             WHERE m.mcard_id = $1`,
            [mcardId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Patient not found' });

        const patient = rows[0];
        const existing = await db.query(
            `SELECT lr.*, l.lab_name
             FROM lab_results lr
             JOIN labs l ON l.id = lr.lab_id
             WHERE lr.patient_id = $1
             ORDER BY lr.test_date DESC, lr.id DESC`,
            [patient.id]
        );
        res.json({ success: true, patient, results: existing.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ---------- Add lab result ---------- */
router.post('/results', requireLab, async (req, res) => {
    try {
        const { patient_id, test_name, test_date, result_value, unit,
                reference_range, status, notes } = req.body;
        if (!patient_id || !test_name)
            return res.status(400).json({ success: false, message: 'Missing required fields' });

        const { rows } = await db.query(
            `INSERT INTO lab_results
             (patient_id, lab_id, test_name, test_date, result_value, unit,
              reference_range, status, notes)
             VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7,COALESCE($8,'normal'),$9)
             RETURNING *`,
            [patient_id, req.session.labId, test_name, test_date,
             result_value, unit, reference_range, status, notes]
        );
        res.json({ success: true, result: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ---------- Update lab result ---------- */
router.put('/results/:id', requireLab, async (req, res) => {
    try {
        const { id } = req.params;
        const { test_name, test_date, result_value, unit, reference_range, status, notes } = req.body;
        const { rows } = await db.query(
            `UPDATE lab_results
             SET test_name=$1, test_date=$2, result_value=$3, unit=$4,
                 reference_range=$5, status=$6, notes=$7, updated_at=NOW()
             WHERE id=$8 AND lab_id=$9
             RETURNING *`,
            [test_name, test_date, result_value, unit, reference_range, status, notes,
             id, req.session.labId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Result not found or not yours' });
        res.json({ success: true, result: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ---------- Lab's own submitted results ---------- */
router.get('/my-results', requireLab, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT lr.*, u.full_name AS patient_name, m.mcard_id
             FROM lab_results lr
             JOIN users u ON u.id = lr.patient_id
             LEFT JOIN mcards m ON m.user_id = u.id
             WHERE lr.lab_id = $1
             ORDER BY lr.created_at DESC`,
            [req.session.labId]
        );
        res.json({ success: true, results: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;