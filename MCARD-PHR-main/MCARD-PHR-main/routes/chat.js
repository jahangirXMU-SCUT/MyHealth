// ============================================================
// CHAT ROUTES — Gemini AI + offline rule-based fallback
// ============================================================

const express = require("express");
const { query } = require("../db");

const router = express.Router();

// ------------------------------------------------------------
// Gemini client (loaded only if API key exists)
// ------------------------------------------------------------
let ai = null;
if (process.env.GEMINI_API_KEY) {
    try {
        const { GoogleGenAI } = require("@google/genai");
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        console.log("✅ Gemini AI client initialized");
    } catch (err) {
        console.warn("⚠️  Gemini client failed to load:", err.message);
    }
} else {
    console.warn("⚠️  GEMINI_API_KEY missing — chat will use offline mode only");
}

// ------------------------------------------------------------
// OFFLINE BOT — rule-based replies from the user's own data
// ------------------------------------------------------------

function formatApptDate(value) {
    if (!value) return "—";
    const s = String(value).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + "T00:00:00");
        return d.toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
    }
    return s;
}

function buildOfflineReply(message, ctx) {
    const q = String(message || "").toLowerCase().trim();
    const {
        user, activeToday, upcomingAppointments, recentReports,
        totalReports, totalMedicines, today, fullName
    } = ctx;

    const has = (...words) => words.some(w => q.includes(w));
    const firstName = (fullName || "there").split(" ")[0];

    // Time of day for greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning"
                   : hour < 18 ? "Good afternoon"
                   : "Good evening";

    // ---------- 1. Greetings ----------
    if (has("hello", "hi ", "hey", "good morning", "good afternoon", "good evening", "salam", "assalam", "assalamu")) {
        return `${greeting}, ${firstName}! 👋\n\nI'm MedHelper's offline assistant. Gemini isn't reachable right now, but I can answer questions about your medicines, appointments, reports, and health info stored locally. What would you like to know?`;
    }

    if (has("how are you", "how're you", "what's up", "whats up")) {
        return `I'm running in offline mode but fully operational! 💚\n\nI can still help you with your MedHelper data — try asking about your medicines, appointments, or reports.`;
    }

    if (has("thank", "thanks", "shukriya", "dhanyabad")) {
        return `You're welcome, ${firstName}! 😊 Anything else I can help with?`;
    }

    if (has("bye", "goodbye", "see you", "khoda hafez")) {
        return `Take care, ${firstName}! 👋 Come back anytime you need help.`;
    }

    // ---------- 2. Help / capabilities ----------
    if (has("help", "what can you do", "commands", "features", "what do you know")) {
        return [
            `Here's what I can help with, ${firstName}:`,
            "",
            "💊 **Medicines**",
            "   • What medicines do I take today?",
            "   • How many medicines do I have?",
            "",
            "📅 **Appointments**",
            "   • When is my next appointment?",
            "   • Show my upcoming appointments",
            "",
            "📁 **Reports**",
            "   • How many reports do I have?",
            "",
            "👤 **Profile**",
            "   • What's my MCard ID?",
            "   • What's my emergency contact?",
            "   • What are my allergies?",
            "",
            "⚡ *Gemini is currently unavailable, so I'm using local data only.*"
        ].join("\n");
    }

    // ---------- 3. Medicines ----------
    if (has("medicine", "medicines", "meds", "pill", "pills", "dose", "doses", "tablet", "capsule")) {
        if (activeToday.length === 0) {
            return `You have no medicines scheduled for today.\n\nYou have **${totalMedicines}** medicine${totalMedicines === 1 ? "" : "s"} on record. Open the Medicines page to add or manage them.`;
        }

        if (has("today", "now", "schedule", "list", "show", "what")) {
            const lines = activeToday.map(m => {
                const parts = [];
                if (m.dosageMorning > 0) parts.push(`${m.dosageMorning} morning`);
                if (m.dosageNoon > 0) parts.push(`${m.dosageNoon} noon`);
                if (m.dosageNight > 0) parts.push(`${m.dosageNight} night`);
                const taken = (m.takenSlots || []).length;
                const total = (m.dosageMorning > 0 ? 1 : 0)
                            + (m.dosageNoon > 0 ? 1 : 0)
                            + (m.dosageNight > 0 ? 1 : 0);
                return `• **${m.name}** — ${parts.join(", ")}  (${taken}/${total} taken)`;
            });
            return `Here are your medicines for today (${today}):\n\n${lines.join("\n")}\n\n✅ Check them off on the Medicines page as you take them.`;
        }

        if (has("how many", "count", "total")) {
            return `You have **${totalMedicines}** medicine${totalMedicines === 1 ? "" : "s"} on record, with **${activeToday.length}** scheduled for today.`;
        }

        return `You have **${activeToday.length}** medicine${activeToday.length === 1 ? "" : "s"} scheduled for today out of **${totalMedicines}** total.\n\nAsk me "what medicines do I take today?" for the full list.`;
    }

    // ---------- 4. Appointments ----------
    if (has("appointment", "appointments", "doctor visit", "checkup", "check-up", "meeting", "when do i see")) {
        if (upcomingAppointments.length === 0) {
            return `You have no upcoming appointments. 📅\n\nOpen the **Find Doctors** page to request one, or add a personal reminder from the Appointments page.`;
        }

        if (has("next", "upcoming", "first", "when")) {
            const a = upcomingAppointments[0];
            return `Your next appointment is:\n\n👨‍⚕️ **${a.doctorName}**\n📅 ${formatApptDate(a.date)}\n${a.time ? `⏰ ${a.time}\n` : ""}${a.location ? `📍 ${a.location}\n` : ""}${a.status === "requested" ? "\n⏳ *Awaiting doctor's confirmation*" : ""}`;
        }

        const lines = upcomingAppointments.slice(0, 5).map(a => {
            const date = formatApptDate(a.date);
            const status = a.status === "requested" ? " ⏳"
                         : a.status === "confirmed" ? " ✅"
                         : "";
            return `• **${a.doctorName}** — ${date}${a.time ? " at " + a.time : ""}${status}`;
        });
        return `You have **${upcomingAppointments.length}** upcoming appointment${upcomingAppointments.length === 1 ? "" : "s"}:\n\n${lines.join("\n")}`;
    }

    // ---------- 5. Reports ----------
    if (has("report", "reports", "prescription", "prescriptions", "test result", "test results")) {
        if (totalReports === 0) {
            return `You haven't uploaded any reports yet.\n\nOpen the **Reports** page and click **Add Report** to upload your first prescription.`;
        }
        return `You have **${totalReports}** report${totalReports === 1 ? "" : "s"} on file.\n\nOpen the **Reports** page to view, print, or download them.`;
    }

    // ---------- 6. Emergency contact ----------
    if (has("emergency", "contact", "next of kin", "ice", "call if")) {
        if (!user.emergencyContactName) {
            return `You haven't set an emergency contact yet.\n\nYou can add one from **Edit Profile → Emergency Contact**.`;
        }
        return `Your emergency contact is:\n\n**${user.emergencyContactName}**\n📞 ${user.emergencyContactNumber || "no number saved"}`;
    }

    // ---------- 7. Profile / personal info ----------
    if (has("my name", "who am i", "my profile", "my info", "my id", "mcard", "my mcard")) {
        return `Here's your profile:\n\n👤 **${user.fullName}**\n📧 ${user.email || "—"}\n📞 ${user.mobile || "—"}\n🆔 MCard: \`${user.mcardId || "not issued"}\`\n🩸 Blood group: ${user.bloodGroup || "—"}`;
    }

    if (has("allergy", "allergies", "allergic")) {
        const v = user.allergies && user.allergies !== "None"
            ? user.allergies
            : "none recorded";
        return `Your allergies on file: **${v}**\n\n${v === "none recorded" ? "You can add allergies from **Edit Profile**." : "Stay careful when taking new medicines."}`;
    }

    if (has("disease", "diseases", "condition", "conditions", "illness")) {
        const v = user.diseases && user.diseases !== "None"
            ? user.diseases
            : "none recorded";
        return `Your diseases/conditions on file: **${v}**`;
    }

    if (has("blood", "blood group", "blood type")) {
        return user.bloodGroup
            ? `Your blood group on file is **${user.bloodGroup}**. 🩸`
            : `You haven't recorded your blood group yet. You can add it from **Edit Profile**.`;
    }

    if (has("date of birth", "birthday", "birthdate", "how old")) {
        if (!user.dateOfBirth) {
            return `Your date of birth isn't recorded yet. You can add it from **Edit Profile**.`;
        }
        const dob = new Date(user.dateOfBirth);
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return `Your date of birth is **${dob.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}** (${age} years old).`;
    }

    // ---------- 8. Health trends ----------
    if (has("trend", "metric", "blood pressure", "bp", "sugar", "weight", "heart rate", "temperature", "oxygen", "vitals")) {
        return `You can log and view your health readings on the **Health Trends** page.\n\nThe page tracks:\n• Blood pressure (systolic / diastolic)\n• Blood sugar\n• Weight\n• Heart rate\n• Temperature\n• Oxygen saturation`;
    }

    // ---------- 9. Summary ----------
    if (has("summary", "history", "visited doctors", "past doctors", "prescribed")) {
        return `Your **Medical Summary** page shows:\n\n📋 All doctors you've visited\n💊 All medicines prescribed to you\n\nOpen it from the sidebar.`;
    }

    // ---------- 10. Fallback ----------
    return [
        `I'm not sure how to answer that right now, ${firstName}.`,
        "",
        "I'm running in **offline mode** (Gemini isn't reachable), but I can help with:",
        "",
        "• 💊 **What medicines do I take today?**",
        "• 📅 **When is my next appointment?**",
        "• 📁 **How many reports do I have?**",
        "• 👤 **What's my MCard ID?**",
        "• 🩸 **What's my blood group?**",
        "• 📞 **What's my emergency contact?**",
        "",
        "*Try one of these, or ask me a similar question about your data.*"
    ].join("\n");
}

// ------------------------------------------------------------
// Load user context for the AI / fallback
// ------------------------------------------------------------
async function loadUserContext(userId) {
    const { rows: userRows } = await query("SELECT * FROM users WHERE id = $1", [userId]);
    if (userRows.length === 0) return null;
    const u = userRows[0];

// Normalize to camelCase so prompt + offline bot work consistently
const user = {
    id: u.id,
    fullName: u.full_name,
    mobile: u.mobile,
    email: u.email,
    dateOfBirth: u.date_of_birth ? String(u.date_of_birth).slice(0, 10) : null,
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
    mcardId: null // filled in below
};

    const { rows: mcard } = await query("SELECT mcard_id FROM mcards WHERE user_id = $1", [userId]);
    user.mcardId = mcard[0]?.mcard_id || null;

    const { rows: meds } = await query(
        "SELECT * FROM medicines WHERE user_id = $1 AND is_active = TRUE",
        [userId]
    );

    const today = new Date().toISOString().split("T")[0];

    // Filter to medicines active today
    const activeToday = [];
    for (const m of meds) {
        const start = String(m.start_date).slice(0, 10);
        const startMs = new Date(start + "T00:00:00").getTime();
        const endMs = startMs + (m.duration_days - 1) * 86400000;
        const todayMs = new Date(today + "T00:00:00").getTime();
        if (todayMs < startMs || todayMs > endMs) continue;

        // Get today's taken slots
        const { rows: intakes } = await query(
            `SELECT slot FROM medicine_intakes
             WHERE medicine_id = $1 AND intake_date = $2`,
            [m.id, today]
        );

        activeToday.push({
            id: m.id,
            name: m.name,
            dosageMorning: m.dosage_morning,
            dosageNoon: m.dosage_noon,
            dosageNight: m.dosage_night,
            durationDays: m.duration_days,
            takenSlots: intakes.map(i => i.slot)
        });
    }

    const { rows: appts } = await query(
        `SELECT id, doctor_name, appointment_date, appointment_time,
                location, status, reason
         FROM appointments
         WHERE user_id = $1 AND appointment_date >= $2
         ORDER BY appointment_date ASC
         LIMIT 10`,
        [userId, today]
    );

    const upcomingAppointments = appts.map(a => ({
        id: a.id,
        doctorName: a.doctor_name,
        date: a.appointment_date,
        time: a.appointment_time,
        location: a.location,
        status: a.status,
        reason: a.reason
    }));

    const { rows: reportCount } = await query(
        "SELECT COUNT(*)::int AS c FROM reports WHERE user_id = $1",
        [userId]
    );

    const { rows: medCount } = await query(
        "SELECT COUNT(*)::int AS c FROM medicines WHERE user_id = $1",
        [userId]
    );

   return {
    user,
    fullName: user.fullName,   // ← camelCase, correct
    activeToday,
    upcomingAppointments,
    totalReports: reportCount[0].c,
    totalMedicines: medCount[0].c,
    today
};
}

// ------------------------------------------------------------
// POST /api/patient/chat
// ------------------------------------------------------------
router.post("/api/patient/chat", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Login required." });
        }

        const { message, history } = req.body;

        if (!message || !String(message).trim()) {
            return res.status(400).json({ success: false, message: "Empty message." });
        }

        // Load user data for both AI and fallback
        const ctx = await loadUserContext(req.session.userId);
        if (!ctx) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // If AI is unavailable, go straight to offline
        if (!ai) {
            const reply = buildOfflineReply(message, ctx);
            return res.json({
                success: true,
                reply,
                source: "offline",
                reason: "AI not configured"
            });
        }

        // ---- Build Gemini prompt ----
        const systemPrompt = `You are MedHelper Assistant, a helpful medical-organizer AI.
Answer questions using ONLY the user's data below.
NEVER diagnose, prescribe, or give medical advice.
If the user asks something you cannot answer from the data, say so politely.
Keep replies concise, friendly, and use markdown (bold with **, bullets with •).

USER DATA:
- Name: ${ctx.user.full_name || "Unknown"}
- MCard ID: ${ctx.user.mcardId || "not issued"}
- Mobile: ${ctx.user.mobile || "—"}
- Email: ${ctx.user.email || "—"}
- Blood group: ${ctx.user.bloodGroup || "not recorded"}
- Date of birth: ${ctx.user.dateOfBirth || "not recorded"}
- Allergies: ${ctx.user.allergies || "none recorded"}
- Diseases: ${ctx.user.diseases || "none recorded"}
- Emergency contact: ${ctx.user.emergencyContactName || "not set"} (${ctx.user.emergencyContactNumber || "—"})

TODAY: ${ctx.today}

TODAY'S MEDICINES (${ctx.activeToday.length}):
${ctx.activeToday.length === 0
    ? "  (none scheduled)"
    : ctx.activeToday.map(m => {
        const slots = [];
        if (m.dosageMorning > 0) slots.push(`${m.dosageMorning} morning`);
        if (m.dosageNoon > 0) slots.push(`${m.dosageNoon} noon`);
        if (m.dosageNight > 0) slots.push(`${m.dosageNight} night`);
        return `  • ${m.name} — ${slots.join(", ")} (taken: ${m.takenSlots.join(",") || "none"})`;
      }).join("\n")}

TOTAL MEDICINES ON RECORD: ${ctx.totalMedicines}
TOTAL REPORTS: ${ctx.totalReports}

UPCOMING APPOINTMENTS (${ctx.upcomingAppointments.length}):
${ctx.upcomingAppointments.length === 0
    ? "  (none)"
    : ctx.upcomingAppointments.map(a => {
        return `  • ${a.doctorName} — ${String(a.date).slice(0,10)}${a.time ? " at " + a.time : ""} (${a.status})`;
      }).join("\n")}

Conversation so far:
${(history || []).slice(-6).map(h => `${h.role === "user" ? "User" : "You"}: ${h.content}`).join("\n")}

User's new question: ${String(message).trim()}

Your reply:`;

        // ---- Call Gemini ----
        try {
            const interaction = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: systemPrompt
            });

            const reply = interaction.text
                || interaction.candidates?.[0]?.content?.parts?.[0]?.text
                || "I couldn't generate a response.";

            return res.json({ success: true, reply, source: "gemini" });

        } catch (aiErr) {
            // ---- Gemini failed → offline fallback ----
            console.warn("⚠️  Gemini call failed:", aiErr.message);

            const status = aiErr?.status || aiErr?.statusCode;
            const msg = String(aiErr?.message || "").toLowerCase();

            let reason = "unknown";
            if (status === 429 || msg.includes("rate") || msg.includes("quota") || msg.includes("too many")) {
                reason = "rate_limit";
            } else if (msg.includes("timeout") || msg.includes("network") || msg.includes("fetch")) {
                reason = "network";
            } else if (msg.includes("api key") || msg.includes("permission") || status === 401 || status === 403) {
                reason = "auth";
            } else if (msg.includes("safety") || msg.includes("blocked")) {
                reason = "blocked";
            }

            const reply = buildOfflineReply(message, ctx);

            return res.json({
                success: true,
                reply,
                source: "offline",
                reason
            });
        }

    } catch (err) {
        console.error("Chat route error:", err);
        res.status(500).json({
            success: false,
            message: "Chat service unavailable."
        });
    }
});

module.exports = router;