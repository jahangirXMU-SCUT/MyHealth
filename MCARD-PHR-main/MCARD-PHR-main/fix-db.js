// fix-db.js — add missing columns to all tables
require("dotenv").config();
const { pool } = require("./db");

(async () => {
    console.log("🔧 Adding missing columns...\n");

    try {
        // Add profile_picture to all relevant tables
        await pool.query("ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS profile_picture TEXT");
        console.log("✅ pharmacies.profile_picture");

        await pool.query("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_picture TEXT");
        console.log("✅ doctors.profile_picture");

        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT");
        console.log("✅ users.profile_picture");

        await pool.query("ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_picture TEXT");
        console.log("✅ admins.profile_picture");

        // Also make sure username is present on both
        await pool.query("ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS username VARCHAR(80) UNIQUE");
        console.log("✅ pharmacies.username");

        await pool.query("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS username VARCHAR(80) UNIQUE");
        console.log("✅ doctors.username");

        // And approved_at/last_login_at
        await pool.query("ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ");
        await pool.query("ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ");
        console.log("✅ pharmacies timestamps");

        await pool.query("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ");
        await pool.query("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ");
        console.log("✅ doctors timestamps");

        // Verify
        console.log("\n📋 Verifying pharmacies columns:");
        const { rows: ph } = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'pharmacies' ORDER BY ordinal_position"
        );
        ph.forEach(r => console.log(`   • ${r.column_name}`));

        console.log("\n📋 Verifying doctors columns:");
        const { rows: dr } = await pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'doctors' ORDER BY ordinal_position"
        );
        dr.forEach(r => console.log(`   • ${r.column_name}`));

        console.log("\n✅ Done. Restart the server and hard refresh the browser.");
    } catch (err) {
        console.error("\n❌ Error:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();