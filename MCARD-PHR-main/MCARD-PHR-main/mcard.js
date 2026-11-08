// ============================================================
// MCARD ID GENERATOR
// Format: YYYY-DOM-LAST6PHONE
//   YYYY        = year card was issued
//   DOM         = month of birth (01–12)
//   LAST6PHONE  = last 6 digits of mobile number
// Example: 2026-03-234567
// ============================================================

const { query } = require("./db");

function pad2(n) {
    return String(n).padStart(2, "0");
}

function buildMcardId(dateOfBirth, mobile, issuedYear = new Date().getFullYear()) {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) throw new Error("Invalid date of birth");

    const month = pad2(dob.getMonth() + 1);
    const digits = String(mobile || "").replace(/\D/g, "");
    const last6 = digits.slice(-6).padStart(6, "0");

    return `${issuedYear}-${month}-${last6}`;
}

async function ensureMcard(userId, dateOfBirth, mobile) {
    // Already exists? Return it.
    const existing = await query(
        "SELECT * FROM mcards WHERE user_id = $1",
        [userId]
    );
    if (existing.rows.length > 0) return existing.rows[0];

    const year = new Date().getFullYear();
    let mcardId = buildMcardId(dateOfBirth, mobile, year);

    // Collision check — if same ID exists, append a counter
    let attempt = 0;
    while (true) {
        const clash = await query(
            "SELECT id FROM mcards WHERE mcard_id = $1",
            [mcardId]
        );
        if (clash.rows.length === 0) break;
        attempt++;
        mcardId = `${buildMcardId(dateOfBirth, mobile, year)}-${attempt}`;
        if (attempt > 50) throw new Error("Could not generate unique MCard ID");
    }

    const { rows } = await query(
        `INSERT INTO mcards (user_id, mcard_id, issued_year)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, mcardId, year]
    );
    return rows[0];
}

async function getMcard(userId) {
    const { rows } = await query(
        "SELECT * FROM mcards WHERE user_id = $1",
        [userId]
    );
    return rows[0] || null;
}

async function findByMcardId(mcardId) {
    const { rows } = await query(
        `SELECT m.*, u.id AS user_id, u.full_name, u.mobile, u.email,
                u.blood_group, u.allergies, u.diseases,
                u.emergency_contact_name, u.emergency_contact_number
         FROM mcards m
         JOIN users u ON u.id = m.user_id
         WHERE m.mcard_id = $1`,
        [mcardId]
    );
    return rows[0] || null;
}

module.exports = { buildMcardId, ensureMcard, getMcard, findByMcardId };