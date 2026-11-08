// ============================================================
// MCARD-PHR BACKEND SERVER — v4.1
// ============================================================

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { pool, testConnection } = require("./db");
const PgStore = require("connect-pg-simple")(session);

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");

[
    UPLOAD_DIR,
    path.join(UPLOAD_DIR, "profiles"),
    path.join(UPLOAD_DIR, "reports"),
    path.join(UPLOAD_DIR, "doctors"),
    path.join(UPLOAD_DIR, "pharmacies")
].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

// ------------------------------------------------------------
// SESSION CONFIG
// ------------------------------------------------------------
app.use(session({
    store: new PgStore({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true
    }),
    name: "mcardphr.sid",
    secret: process.env.SESSION_SECRET || "mcard-phr-dev-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,          // ✅ Refresh cookie TTL on every request
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 8,   // 8 hours
        path: "/"           // ✅ Cookie valid on ALL routes (/, /doctor, /pharmacy, /api/*)
    }
}));

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

// ------------------------------------------------------------
// ROUTERS
// ------------------------------------------------------------
const { router: authRouter } = require("./routes/auth");
const patientRouter = require("./routes/patient");
const doctorRouter = require("./routes/doctor");
const pharmacyRouter = require("./routes/pharmacy");
const adminRouter = require("./routes/admin");
const mcardRouter = require("./routes/mcard");
const publicApiRouter = require("./routes/public-api");
const chatRouter = require("./routes/chat");

app.use("/api", authRouter);
app.use("/api/patient", patientRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/pharmacy", pharmacyRouter);
app.use("/api/admin", adminRouter);
app.use("/api/public", publicApiRouter);
app.use(mcardRouter);       // /api/mcard, /emergency/:mcardId
app.use(chatRouter);        // /api/patient/chat (Gemini + offline fallback)

app.use('/api/lab', require('./routes/lab'));
// ------------------------------------------------------------
// PAGE ROUTES
// ------------------------------------------------------------
app.get("/", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/doctor", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "doctor.html")));
app.get("/pharmacy", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "pharmacy.html")));
app.get('/lab', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lab.html')));
// ------------------------------------------------------------
// ERROR HANDLER
// ------------------------------------------------------------
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        let message = error.message;
        if (error.code === "LIMIT_FILE_SIZE") message = "File is too large.";
        if (error.code === "LIMIT_FILE_COUNT") message = "Too many files.";
        if (error.code === "LIMIT_UNEXPECTED_FILE") message = "Unexpected file field.";
        return res.status(400).json({ success: false, message });
    }
    if (error) {
        console.error("Server error:", error);
        return res.status(400).json({ success: false, message: error.message || "Something went wrong." });
    }
    next();
});

// ------------------------------------------------------------
// BOOT
// ------------------------------------------------------------
(async () => {
    const ok = await testConnection();
    if (!ok) {
        console.error("\n❌ Cannot connect to PostgreSQL. Check DATABASE_URL.\n");
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log("======================================");
        console.log("       MCARD-PHR v4.1 RUNNING");
        console.log("======================================");
        console.log(`  Patient   : http://localhost:${PORT}/`);
        console.log(`  Doctor    : http://localhost:${PORT}/doctor`);
        console.log(`  Pharmacy  : http://localhost:${PORT}/pharmacy`);
        console.log(`  Admin CLI : npm run admin`);
        console.log("======================================");
    });
})();

process.on("SIGINT", async () => {
    console.log("\n👋 Shutting down...");
    await pool.end();
    process.exit(0);
});