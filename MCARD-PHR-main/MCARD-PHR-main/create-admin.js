#!/usr/bin/env node
// ============================================================
// MCARD-PHR — INTERACTIVE ADMIN CLI
// Manage: admins, doctors, pharmacies
// Run: node create-admin.js   (or)   npm run admin
// ============================================================

require("dotenv").config();

const readline = require("readline");
const bcrypt = require("bcryptjs");
const { pool, testConnection } = require("./db");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

function askHidden(question) {
    return new Promise(resolve => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        stdout.write(question);
        const wasRaw = stdin.isRaw;
        if (stdin.isTTY) stdin.setRawMode(true);
        let input = "";
        const onData = char => {
            char = char.toString("utf8");
            switch (char) {
                case "\n":
                case "\r":
                case "\u0004":
                    if (stdin.isTTY) stdin.setRawMode(wasRaw || false);
                    stdin.removeListener("data", onData);
                    stdout.write("\n");
                    resolve(input);
                    break;
                case "\u0003":
                    stdout.write("\n");
                    process.exit(0);
                    break;
                case "\u007F":
                case "\b":
                    if (input.length > 0) {
                        input = input.slice(0, -1);
                        stdout.clearLine(0);
                        stdout.cursorTo(0);
                        stdout.write(question + "*".repeat(input.length));
                    }
                    break;
                default:
                    input += char;
                    stdout.write("*");
                    break;
            }
        };
        stdin.on("data", onData);
    });
}

function clear() { process.stdout.write("\x1Bc"); }

function header() {
    console.log("");
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║   MCARD-PHR — MANAGEMENT CONSOLE             ║");
    console.log("║   Admins · Doctors · Pharmacies              ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log("");
}

function pause() { return ask("\n  Press Enter to continue..."); }

const validUser = v => /^[a-zA-Z0-9._-]{3,30}$/.test(v);
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// ============================================================
// ADMINS
// ============================================================

async function listAdmins() {
    console.log("\n  📋  All administrators:\n");
    const { rows } = await pool.query(`
        SELECT id, username, email, full_name, is_super, is_active, created_at
        FROM admins ORDER BY is_super DESC, created_at ASC
    `);
    if (rows.length === 0) { console.log("     (no admins yet)"); return rows; }
    const border = "  " + "─".repeat(96);
    console.log(border);
    console.log("  " + "ID".padEnd(10) + "USERNAME".padEnd(18) + "EMAIL".padEnd(28) + "ROLE".padEnd(10) + "STATUS".padEnd(10) + "CREATED".padEnd(14));
    console.log(border);
    rows.forEach(r => {
        console.log(
            "  " + String(r.id).slice(0, 8).padEnd(10) +
            String(r.username || "").padEnd(18) +
            String(r.email || "—").padEnd(28) +
            (r.is_super ? "SUPER" : "admin").padEnd(10) +
            (r.is_active ? "active" : "disabled").padEnd(10) +
            new Date(r.created_at).toISOString().slice(0, 10).padEnd(14)
        );
    });
    console.log(border);
    console.log(`  Total: ${rows.length} admin(s).\n`);
    return rows;
}

async function addAdmin() {
    console.log("\n  ➕  Add new administrator\n");
    const username = (await ask("     Username: ")).trim();
    if (!validUser(username)) { console.log("  ❌ Invalid username."); return; }
    const email = (await ask("     Email (optional): ")).trim();
    if (email && !validEmail(email)) { console.log("  ❌ Invalid email."); return; }
    const fullName = (await ask("     Full name (optional): ")).trim();
    const password = await askHidden("     Password (min 8): ");
    if (!password || password.length < 8) { console.log("  ❌ Min 8 characters."); return; }
    const confirm = await askHidden("     Confirm password: ");
    if (password !== confirm) { console.log("  ❌ Passwords do not match."); return; }
    const superAns = (await ask("     Super admin? (y/N): ")).trim().toLowerCase();
    const isSuper = superAns === "y" || superAns === "yes";
    try {
        const hash = await bcrypt.hash(password, 12);
        const { rows } = await pool.query(
            `INSERT INTO admins (username, email, password_hash, full_name, is_super)
             VALUES ($1, $2, $3, $4, $5) RETURNING id, username, is_super`,
            [username, email || null, hash, fullName || null, isSuper]
        );
        console.log(`\n  ✅ Admin "${rows[0].username}" created (${rows[0].is_super ? "SUPER" : "admin"}).`);
    } catch (err) {
        console.log(err.code === "23505" ? "  ❌ Username or email already exists." : "  ❌ " + err.message);
    }
}

async function removeAdmin() {
    const admins = await listAdmins();
    if (admins.length === 0) return;
    if (admins.length === 1) { console.log("  ⚠️  Cannot remove the last admin."); return; }
    const idInput = (await ask("  Enter admin ID or username to remove: ")).trim();
    const target = admins.find(a => String(a.id) === idInput || a.username === idInput);
    if (!target) { console.log("  ❌ Not found."); return; }
    if (target.is_super) {
        const others = admins.filter(a => a.is_super && a.id !== target.id);
        if (others.length === 0) { console.log("  ❌ Cannot remove the only super admin."); return; }
    }
    const c = (await ask(`     Really delete "${target.username}"? (y/N): `)).trim().toLowerCase();
    if (c !== "y" && c !== "yes") { console.log("  Cancelled."); return; }
    await pool.query("DELETE FROM admins WHERE id = $1", [target.id]);
    console.log(`  ✅ Admin "${target.username}" removed.`);
}

async function changeAdminPassword() {
    const admins = await listAdmins();
    if (admins.length === 0) return;
    const idInput = (await ask("  Admin ID or username: ")).trim();
    const target = admins.find(a => String(a.id) === idInput || a.username === idInput);
    if (!target) { console.log("  ❌ Not found."); return; }
    const newPass = await askHidden("     New password (min 8): ");
    if (!newPass || newPass.length < 8) { console.log("  ❌ Min 8 chars."); return; }
    const confirm = await askHidden("     Confirm: ");
    if (newPass !== confirm) { console.log("  ❌ Mismatch."); return; }
    const hash = await bcrypt.hash(newPass, 12);
    await pool.query("UPDATE admins SET password_hash = $1 WHERE id = $2", [hash, target.id]);
    console.log(`  ✅ Password updated for "${target.username}".`);
}

async function toggleAdminActive() {
    const admins = await listAdmins();
    if (admins.length === 0) return;
    const idInput = (await ask("  Admin ID or username to toggle: ")).trim();
    const target = admins.find(a => String(a.id) === idInput || a.username === idInput);
    if (!target) { console.log("  ❌ Not found."); return; }
    const newState = !target.is_active;
    await pool.query("UPDATE admins SET is_active = $1 WHERE id = $2", [newState, target.id]);
    console.log(`  ✅ "${target.username}" is now ${newState ? "active" : "disabled"}.`);
}

async function adminMenu() {
    while (true) {
        clear(); header();
        console.log("  👤 ADMIN ACCOUNTS\n");
        console.log("    1.  List admins");
        console.log("    2.  Add admin");
        console.log("    3.  Remove admin");
        console.log("    4.  Change password");
        console.log("    5.  Enable / disable");
        console.log("    0.  Back\n");
        const c = (await ask("  ➤ Choice: ")).trim();
        clear(); header();
        switch (c) {
            case "1": await listAdmins(); break;
            case "2": await addAdmin(); break;
            case "3": await removeAdmin(); break;
            case "4": await changeAdminPassword(); break;
            case "5": await toggleAdminActive(); break;
            case "0": return;
            default: console.log("  ❌ Invalid choice.");
        }
        await pause();
    }
}

// ============================================================
// DOCTORS
// ============================================================

async function listDoctors() {
    console.log("\n  📋  All doctors:\n");
    const { rows } = await pool.query(`
        SELECT id, username, email, full_name, profession, specialization, status, is_active, created_at
        FROM doctors ORDER BY status ASC, created_at ASC
    `);
    if (rows.length === 0) { console.log("     (no doctors yet)"); return rows; }
    const border = "  " + "─".repeat(110);
    console.log(border);
    console.log("  " + "ID".padEnd(10) + "USERNAME".padEnd(16) + "NAME".padEnd(22) + "PROFESSION".padEnd(18) + "STATUS".padEnd(10) + "ACTIVE".padEnd(10) + "CREATED".padEnd(12));
    console.log(border);
    rows.forEach(r => {
        console.log(
            "  " + String(r.id).slice(0, 8).padEnd(10) +
            String(r.username || "—").padEnd(16) +
            String(r.full_name || "—").slice(0, 20).padEnd(22) +
            String(r.profession || "—").slice(0, 16).padEnd(18) +
            String(r.status).padEnd(10) +
            (r.is_active ? "yes" : "no").padEnd(10) +
            new Date(r.created_at).toISOString().slice(0, 10).padEnd(12)
        );
    });
    console.log(border);
    console.log(`  Total: ${rows.length} doctor(s).\n`);
    return rows;
}

async function addDoctor() {
    console.log("\n  ➕  Add new doctor\n");
    const fullName = (await ask("     Full name: ")).trim();
    if (!fullName) { console.log("  ❌ Name required."); return; }
    const email = (await ask("     Email: ")).trim();
    if (!validEmail(email)) { console.log("  ❌ Invalid email."); return; }
    const username = (await ask("     Username (optional): ")).trim() || null;
    const password = await askHidden("     Password (min 8): ");
    if (!password || password.length < 8) { console.log("  ❌ Min 8 chars."); return; }
    const degree = (await ask("     Degree (e.g. MBBS, FCPS): ")).trim() || null;
    const profession = (await ask("     Profession (e.g. Cardiologist): ")).trim() || null;
    const specialization = (await ask("     Specialization: ")).trim() || null;
    const lastWorked = (await ask("     Last worked place: ")).trim() || null;
    const expYears = parseInt((await ask("     Experience (years): ")).trim(), 10) || null;
    const license = (await ask("     License number: ")).trim() || null;
    const fee = parseFloat((await ask("     Consultation fee: ")).trim()) || null;
    const bio = (await ask("     Short bio (optional): ")).trim() || null;
    const approveNow = (await ask("     Approve immediately? (Y/n): ")).trim().toLowerCase();
    const status = (approveNow === "n" || approveNow === "no") ? "pending" : "approved";

    try {
        const hash = await bcrypt.hash(password, 12);
        const { rows } = await pool.query(
            `INSERT INTO doctors
             (username, email, password_hash, full_name, degree, profession,
              specialization, last_worked_place, experience_years,
              license_number, consultation_fee, bio, status, approved_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             RETURNING id, full_name, status`,
            [
                username, email, hash, fullName, degree, profession,
                specialization, lastWorked, expYears, license, fee, bio,
                status, status === "approved" ? new Date() : null
            ]
        );
        console.log(`\n  ✅ Doctor "${rows[0].full_name}" created (${rows[0].status}).`);
    } catch (err) {
        console.log(err.code === "23505" ? "  ❌ Email or username already exists." : "  ❌ " + err.message);
    }
}

async function removeDoctor() {
    const docs = await listDoctors();
    if (docs.length === 0) return;
    const inp = (await ask("  Doctor ID or email to remove: ")).trim();
    const target = docs.find(d => String(d.id) === inp || d.email === inp);
    if (!target) { console.log("  ❌ Not found."); return; }
    const c = (await ask(`     Really delete "${target.full_name}"? (y/N): `)).trim().toLowerCase();
    if (c !== "y" && c !== "yes") { console.log("  Cancelled."); return; }
    await pool.query("DELETE FROM doctors WHERE id = $1", [target.id]);
    console.log(`  ✅ Doctor removed.`);
}

async function toggleDoctorActive() {
    const docs = await listDoctors();
    if (docs.length === 0) return;
    const inp = (await ask("  Doctor ID or email: ")).trim();
    const target = docs.find(d => String(d.id) === inp || d.email === inp);
    if (!target) { console.log("  ❌ Not found."); return; }
    const newState = !target.is_active;
    await pool.query("UPDATE doctors SET is_active = $1 WHERE id = $2", [newState, target.id]);
    console.log(`  ✅ "${target.full_name}" is now ${newState ? "active" : "disabled"}.`);
}

async function doctorMenu() {
    while (true) {
        clear(); header();
        console.log("  🩺 DOCTOR ACCOUNTS\n");
        console.log("    1.  List doctors");
        console.log("    2.  Add doctor");
        console.log("    3.  Remove doctor");
        console.log("    4.  Enable / disable");
        console.log("    0.  Back\n");
        const c = (await ask("  ➤ Choice: ")).trim();
        clear(); header();
        switch (c) {
            case "1": await listDoctors(); break;
            case "2": await addDoctor(); break;
            case "3": await removeDoctor(); break;
            case "4": await toggleDoctorActive(); break;
            case "0": return;
            default: console.log("  ❌ Invalid choice.");
        }
        await pause();
    }
}

// ============================================================
// PHARMACIES
// ============================================================

async function listPharmacies() {
    console.log("\n  📋  All pharmacies:\n");
    const { rows } = await pool.query(`
        SELECT id, username, email, pharmacy_name, license_number, status, is_active, created_at
        FROM pharmacies ORDER BY status ASC, created_at ASC
    `);
    if (rows.length === 0) { console.log("     (no pharmacies yet)"); return rows; }
    const border = "  " + "─".repeat(110);
    console.log(border);
    console.log("  " + "ID".padEnd(10) + "USERNAME".padEnd(16) + "PHARMACY".padEnd(28) + "LICENSE".padEnd(16) + "STATUS".padEnd(10) + "ACTIVE".padEnd(10) + "CREATED".padEnd(12));
    console.log(border);
    rows.forEach(r => {
        console.log(
            "  " + String(r.id).slice(0, 8).padEnd(10) +
            String(r.username || "—").padEnd(16) +
            String(r.pharmacy_name || "—").slice(0, 26).padEnd(28) +
            String(r.license_number || "—").padEnd(16) +
            String(r.status).padEnd(10) +
            (r.is_active ? "yes" : "no").padEnd(10) +
            new Date(r.created_at).toISOString().slice(0, 10).padEnd(12)
        );
    });
    console.log(border);
    console.log(`  Total: ${rows.length} pharmacy/ies.\n`);
    return rows;
}

async function addPharmacy() {
    console.log("\n  ➕  Add new pharmacy\n");
    const name = (await ask("     Pharmacy name: ")).trim();
    if (!name) { console.log("  ❌ Name required."); return; }
    const email = (await ask("     Email: ")).trim();
    if (!validEmail(email)) { console.log("  ❌ Invalid email."); return; }
    const username = (await ask("     Username (optional): ")).trim() || null;
    const password = await askHidden("     Password (min 8): ");
    if (!password || password.length < 8) { console.log("  ❌ Min 8 chars."); return; }
    const license = (await ask("     License number: ")).trim() || null;
    const address = (await ask("     Address: ")).trim() || null;
    const phone = (await ask("     Phone: ")).trim() || null;
    const approveNow = (await ask("     Approve immediately? (Y/n): ")).trim().toLowerCase();
    const status = (approveNow === "n" || approveNow === "no") ? "pending" : "approved";

    try {
        const hash = await bcrypt.hash(password, 12);
        const { rows } = await pool.query(
            `INSERT INTO pharmacies
             (username, email, password_hash, pharmacy_name, license_number,
              address, phone, status, approved_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING id, pharmacy_name, status`,
            [
                username, email, hash, name, license, address, phone,
                status, status === "approved" ? new Date() : null
            ]
        );
        console.log(`\n  ✅ Pharmacy "${rows[0].pharmacy_name}" created (${rows[0].status}).`);
    } catch (err) {
        console.log(err.code === "23505" ? "  ❌ Email or username already exists." : "  ❌ " + err.message);
    }
}

async function removePharmacy() {
    const ph = await listPharmacies();
    if (ph.length === 0) return;
    const inp = (await ask("  Pharmacy ID or email to remove: ")).trim();
    const target = ph.find(p => String(p.id) === inp || p.email === inp);
    if (!target) { console.log("  ❌ Not found."); return; }
    const c = (await ask(`     Really delete "${target.pharmacy_name}"? (y/N): `)).trim().toLowerCase();
    if (c !== "y" && c !== "yes") { console.log("  Cancelled."); return; }
    await pool.query("DELETE FROM pharmacies WHERE id = $1", [target.id]);
    console.log(`  ✅ Pharmacy removed.`);
}

async function togglePharmacyActive() {
    const ph = await listPharmacies();
    if (ph.length === 0) return;
    const inp = (await ask("  Pharmacy ID or email: ")).trim();
    const target = ph.find(p => String(p.id) === inp || p.email === inp);
    if (!target) { console.log("  ❌ Not found."); return; }
    const newState = !target.is_active;
    await pool.query("UPDATE pharmacies SET is_active = $1 WHERE id = $2", [newState, target.id]);
    console.log(`  ✅ "${target.pharmacy_name}" is now ${newState ? "active" : "disabled"}.`);
}

async function pharmacyMenu() {
    while (true) {
        clear(); header();
        console.log("  💊 PHARMACY ACCOUNTS\n");
        console.log("    1.  List pharmacies");
        console.log("    2.  Add pharmacy");
        console.log("    3.  Remove pharmacy");
        console.log("    4.  Enable / disable");
        console.log("    0.  Back\n");
        const c = (await ask("  ➤ Choice: ")).trim();
        clear(); header();
        switch (c) {
            case "1": await listPharmacies(); break;
            case "2": await addPharmacy(); break;
            case "3": await removePharmacy(); break;
            case "4": await togglePharmacyActive(); break;
            case "0": return;
            default: console.log("  ❌ Invalid choice.");
        }
        await pause();
    }
}

// ============================================================
// MAIN MENU
// ============================================================

async function mainMenu() {
    while (true) {
        clear(); header();
        console.log("  Choose a category:\n");
        console.log("    1.  👤 Admin accounts");
        console.log("    2.  🩺 Doctor accounts");
        console.log("    3.  💊 Pharmacy accounts");
        console.log("    0.  Exit\n");
        const c = (await ask("  ➤ Choice: ")).trim();
        switch (c) {
            case "1": await adminMenu(); break;
            case "2": await doctorMenu(); break;
            case "3": await pharmacyMenu(); break;
            case "0":
            case "q":
            case "exit":
                console.log("\n  👋 Goodbye.\n");
                rl.close();
                await pool.end();
                process.exit(0);
            default:
                clear(); header();
                console.log("  ❌ Invalid choice.");
                await pause();
        }
    }
}

(async () => {
    clear(); header();
    const ok = await testConnection();
    if (!ok) {
        console.log("\n  ❌ Cannot connect to PostgreSQL. Check .env DATABASE_URL.\n");
        process.exit(1);
    }
    await mainMenu();
})();