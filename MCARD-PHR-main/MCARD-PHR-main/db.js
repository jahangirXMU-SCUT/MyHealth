// ============================================================
// MCARD-PHR — DATABASE LAYER (PostgreSQL)
// ============================================================

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const useSSL =
    String(process.env.DATABASE_SSL || "").toLowerCase() === "true" ||
    (process.env.DATABASE_URL || "").includes("supabase");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on("error", err => {
    console.error("❌ PostgreSQL pool error:", err);
});

async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "production") {
        console.log(`  ⚡ query (${duration}ms) rows=${res.rowCount}`);
    }
    return res;
}

async function getClient() {
    const client = await pool.connect();
    return client;
}

async function testConnection() {
    try {
        const result = await pool.query("SELECT NOW() AS now");
        console.log("✅ PostgreSQL connected:", result.rows[0].now);
        return true;
    } catch (err) {
        console.error("❌ PostgreSQL connection failed:", err.message);
        return false;
    }
}

async function migrate() {
    console.log("📦 Running database migration...");
    const schemaPath = path.join(__dirname, "schema.sql");
    if (!fs.existsSync(schemaPath)) {
        console.error("❌ schema.sql not found");
        process.exit(1);
    }
    const sql = fs.readFileSync(schemaPath, "utf8");
    try {
        await pool.query(sql);
        console.log("✅ Migration complete.");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function seed() {
    console.log("🌱 Seeding default admin...");
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash("admin", 10);
    try {
        await pool.query(
            `INSERT INTO admins (username, email, password_hash, full_name, is_super)
             VALUES ($1, $2, $3, $4, TRUE)
             ON CONFLICT (username) DO NOTHING`,
            ["admin", "admin@mcard-phr.local", passwordHash, "Super Admin"]
        );
        console.log("✅ Default admin seeded (admin / admin).");
        console.log("⚠️  Change the password immediately after first login.");
    } catch (err) {
        console.error("❌ Seed failed:", err.message);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    const arg = process.argv[2];
    (async () => {
        const ok = await testConnection();
        if (!ok) process.exit(1);
        if (arg === "--migrate") await migrate();
        else if (arg === "--seed") await seed();
        else {
            console.log("Usage: node db.js [--migrate|--seed]");
            await pool.end();
        }
    })();
}

module.exports = { pool, query, getClient, testConnection, migrate, seed };