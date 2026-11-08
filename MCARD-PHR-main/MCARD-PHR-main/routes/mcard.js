// ============================================================
// MCARD PDF GENERATOR + QR endpoints
// ============================================================

const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const { query } = require("../db");
const { ensureMcard, findByMcardId } = require("../mcard");

const router = express.Router();

const ROOT_DIR = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");

function escapeHtml(v) {
    return String(v || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ------------------------------------------------------------
// 3D-ish text: layered offsets underneath a bright top layer
// ------------------------------------------------------------
function draw3DText(page, text, { x, y, size, font, topColor, layers = 8, offset = 0.35, darkColor }) {
    for (let i = layers; i >= 1; i--) {
        page.drawText(text, {
            x: x + i * offset,
            y: y - i * offset,
            size, font,
            color: darkColor || rgb(0.02, 0.08, 0.05)
        });
    }
    page.drawText(text, { x, y, size, font, color: topColor });
}

// ------------------------------------------------------------
// Build emergency URL for QR
// ------------------------------------------------------------
function buildEmergencyUrl(req, mcardId) {
    const proto = req.protocol;
    const host = req.get("host");
    return `${proto}://${host}/emergency/${mcardId}`;
}

// ------------------------------------------------------------
// GET /api/mcard  — patient's MCard info (JSON)
// ------------------------------------------------------------
router.get("/api/mcard", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Login required." });
        }
        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });

        const u = rows[0];
        const mcard = await ensureMcard(u.id, u.date_of_birth, u.mobile);

        res.json({
            success: true,
            mcard: {
                mcardId: mcard.mcard_id,
                issuedYear: mcard.issued_year,
                fullName: u.full_name,
                mobile: u.mobile,
                email: u.email,
                bloodGroup: u.blood_group,
                dateOfBirth: u.date_of_birth,
                emergencyContactName: u.emergency_contact_name,
                emergencyContactNumber: u.emergency_contact_number,
                emergencyUrl: buildEmergencyUrl(req, mcard.mcard_id)
            }
        });
    } catch (err) {
        console.error("MCard fetch error:", err);
        res.status(500).json({ success: false, message: "Could not load MCard." });
    }
});

// ------------------------------------------------------------
// GET /api/mcard/qr.svg — QR code image (SVG)
// ------------------------------------------------------------
router.get("/api/mcard/qr.svg", async (req, res) => {
    try {
        if (!req.session.userId) return res.status(401).send("Login required.");
        const { rows } = await query("SELECT id, date_of_birth, mobile FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) return res.status(404).send("Not found.");

        const mcard = await ensureMcard(rows[0].id, rows[0].date_of_birth, rows[0].mobile);
        const url = buildEmergencyUrl(req, mcard.mcard_id);

        const svg = await QRCode.toString(url, {
            type: "svg",
            width: 320,
            margin: 2,
            errorCorrectionLevel: "H",
            color: { dark: "#0B3D1F", light: "#FFFFFF" }
        });

        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "no-cache");
        res.send(svg);
    } catch (err) {
        console.error("QR error:", err);
        res.status(500).send("QR error.");
    }
});

// ------------------------------------------------------------
// GET /api/mcard/card.pdf — MCard PDF download
// ------------------------------------------------------------
router.get("/api/mcard/card.pdf", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: "Login required." });
        }
        const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found." });

        const u = rows[0];
        const mcard = await ensureMcard(u.id, u.date_of_birth, u.mobile);
        const emergencyUrl = buildEmergencyUrl(req, mcard.mcard_id);

        const qrDataUrl = await QRCode.toDataURL(emergencyUrl, {
            errorCorrectionLevel: "H", width: 512, margin: 1,
            color: { dark: "#0B3D1F", light: "#FFFFFF" }
        });
        const qrPngBuffer = Buffer.from(
            qrDataUrl.replace(/^data:image\/png;base64,/, ""), "base64"
        );

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4 portrait

        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);

        // Profile picture (optional)
        let profileImage = null;
        if (u.profile_picture) {
            const rel = u.profile_picture.replace(/^\/uploads[\/\\]/, "");
            const full = path.join(UPLOAD_DIR, rel);
            if (fs.existsSync(full)) {
                try {
                    const bytes = fs.readFileSync(full);
                    const ext = path.extname(full).toLowerCase();
                    if (ext === ".png") profileImage = await pdfDoc.embedPng(bytes);
                    else if (ext === ".jpg" || ext === ".jpeg") profileImage = await pdfDoc.embedJpg(bytes);
                } catch (e) { profileImage = null; }
            }
        }

        // Colors
        const cardGreen = rgb(0.043, 0.239, 0.122);
        const cardGreen2 = rgb(0.078, 0.325, 0.176);
        const labelSilver = rgb(0.78, 0.82, 0.80);
        const white = rgb(1, 1, 1);
        const topText = rgb(0.88, 0.96, 0.90);
        const accent = rgb(0.60, 0.86, 0.66);

        // Card geometry
        const CARD_W = 242.65;
        const CARD_H = 187;
        const pageW = page.getWidth();
        const cardX = (pageW - CARD_W) / 2;
        const cardTop = 720;
        const cardY = cardTop - CARD_H;

        // Page title (with 3D)
        draw3DText(page, "MCARD-PHR Health Card", {
            x: cardX, y: 800, size: 16, font: fontBold,
            topColor: rgb(0.16, 0.42, 0.27),
            darkColor: rgb(0.06, 0.20, 0.11),
            offset: 0.25, layers: 4
        });

        page.drawText(
            "Print on A4 at 100% scale. Cut along the card border. Laminate for durability.",
            { x: cardX, y: 780, size: 8.5, font: fontRegular,
              color: rgb(0.42, 0.42, 0.42), maxWidth: CARD_W }
        );

        // Card shadow
        page.drawRectangle({
            x: cardX + 2, y: cardY - 2, width: CARD_W, height: CARD_H,
            color: rgb(0.72, 0.72, 0.72), opacity: 0.35
        });

        // Card body
        page.drawRectangle({ x: cardX, y: cardY, width: CARD_W, height: CARD_H, color: cardGreen });

        // Top band
        page.drawRectangle({
            x: cardX, y: cardY + CARD_H - 34, width: CARD_W, height: 34,
            color: cardGreen2, opacity: 0.55
        });

        // Border
        page.drawRectangle({
            x: cardX, y: cardY, width: CARD_W, height: CARD_H,
            borderColor: rgb(0.35, 0.65, 0.42), borderWidth: 1.2
        });

        // Header row: "+" + "MCARD" (3D) + "My Health Card" (3D)
        const headerY = cardY + CARD_H - 18;

        // Medical plus
        page.drawRectangle({ x: cardX + 8, y: headerY - 2, width: 16, height: 16, color: white });
        page.drawRectangle({ x: cardX + 14.5, y: headerY + 1, width: 3, height: 10, color: cardGreen });
        page.drawRectangle({ x: cardX + 11, y: headerY + 4.5, width: 10, height: 3, color: cardGreen });

        draw3DText(page, "MCARD", {
            x: cardX + 30, y: headerY + 1, size: 15, font: fontBold,
            topColor: topText, darkColor: rgb(0.02, 0.10, 0.05),
            offset: 0.30, layers: 6
        });

        draw3DText(page, "My Health Card", {
            x: cardX + 110, y: headerY + 2, size: 13, font: fontBold,
            topColor: white, darkColor: rgb(0.02, 0.10, 0.05),
            offset: 0.25, layers: 5
        });

        page.drawLine({
            start: { x: cardX + 8, y: headerY - 7 },
            end: { x: cardX + CARD_W - 8, y: headerY - 7 },
            thickness: 0.8, color: accent
        });

        // Photo
        const photoW = 62, photoH = 74;
        const photoX = cardX + 10;
        const photoY = cardY + CARD_H - 34 - photoH - 8;

        page.drawRectangle({
            x: photoX, y: photoY, width: photoW, height: photoH,
            color: rgb(0.90, 0.90, 0.90), borderColor: white, borderWidth: 1.5
        });

        if (profileImage) {
            const iw = profileImage.width, ih = profileImage.height;
            const fit = Math.min(photoW / iw, photoH / ih);
            page.drawImage(profileImage, {
                x: photoX + (photoW - iw * fit) / 2,
                y: photoY + (photoH - ih * fit) / 2,
                width: iw * fit, height: ih * fit
            });
        } else {
            const initial = String(u.full_name || "U").trim().charAt(0).toUpperCase();
            page.drawText(initial, {
                x: photoX + photoW / 2 - 12, y: photoY + photoH / 2 - 12,
                size: 30, font: fontBold, color: rgb(0.55, 0.60, 0.58)
            });
        }

        // Info block
        const infoX = photoX + photoW + 14;
        let infoY = cardY + CARD_H - 50;

        page.drawText("MHC ID:", { x: infoX, y: infoY, size: 10, font: fontBold, color: labelSilver });
        page.drawText(" " + mcard.mcard_id, { x: infoX + 48, y: infoY, size: 10, font: fontBold, color: white });
        infoY -= 20;

        page.drawText("Name:", { x: infoX, y: infoY, size: 10, font: fontBold, color: labelSilver });
        page.drawText(String(u.full_name || "—").toUpperCase(), {
            x: infoX + 40, y: infoY, size: 11, font: fontBold, color: white,
            maxWidth: CARD_W - (infoX - cardX) - 10
        });
        infoY -= 20;

        page.drawText("CONTACT:", { x: infoX, y: infoY, size: 9, font: fontBold, color: labelSilver });
        page.drawText(String(u.mobile || "—"), {
            x: infoX + 55, y: infoY, size: 10, font: fontBold, color: white
        });
        infoY -= 16;

        if (u.blood_group) {
            page.drawText("BLOOD:", { x: infoX, y: infoY, size: 9, font: fontBold, color: labelSilver });
            page.drawText(String(u.blood_group), {
                x: infoX + 50, y: infoY, size: 10, font: fontBold, color: white
            });
        }

        // Bottom band: QR (left) + MCARD badge (right)
        const bottomY = cardY + 12;
        const qrSize = 44;
        const qrX = cardX + 12;
        const qrY = bottomY;

        page.drawRectangle({ x: qrX - 2, y: qrY - 2, width: qrSize + 4, height: qrSize + 4, color: white });
        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

        page.drawText("Scan for emergency info", {
            x: qrX, y: qrY - 10, size: 6, font: fontRegular, color: labelSilver
        });

        // Right badge: 3D "MCARD"
        const badgeW = 60, badgeH = 34;
        const badgeX = cardX + CARD_W - badgeW - 14;
        const badgeY = bottomY + 4;

        page.drawRectangle({
            x: badgeX, y: badgeY, width: badgeW, height: badgeH,
            color: rgb(0.10, 0.22, 0.14), borderColor: accent, borderWidth: 0.8
        });

        draw3DText(page, "MCARD", {
            x: badgeX + 8, y: badgeY + 12, size: 12, font: fontBold,
            topColor: rgb(0.85, 0.95, 0.88),
            darkColor: rgb(0.02, 0.10, 0.05),
            offset: 0.30, layers: 6
        });

        page.drawText("Health Card", {
            x: badgeX + 10, y: badgeY + 4, size: 6, font: fontRegular, color: labelSilver
        });

        // Footer
        page.drawText(
            `Issued: ${new Date(mcard.issued_at).toLocaleDateString()}    Card holder: ${u.full_name || "—"}`,
            { x: cardX, y: 60, size: 8, font: fontRegular, color: rgb(0.42, 0.42, 0.42) }
        );
        page.drawText(
            "This is not an official government-issued identity document.",
            { x: cardX, y: 44, size: 7.5, font: fontRegular, color: rgb(0.75, 0.15, 0.15) }
        );

        const pdfBytes = await pdfDoc.save();
        const safeName = String(u.full_name || "user").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="mcard-phr-${safeName}.pdf"`);
        res.send(Buffer.from(pdfBytes));
    } catch (err) {
        console.error("MCard PDF error:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Could not generate MCard." });
        }
    }
});

// ------------------------------------------------------------
// GET /emergency/:mcardId — public emergency page
// ------------------------------------------------------------
router.get("/emergency/:mcardId", async (req, res) => {
    try {
        const row = await findByMcardId(req.params.mcardId);
        if (!row) {
            return res.status(404).send(`
                <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Card Not Found — MCARD-PHR</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;}</style></head><body>
                    <h1>MCARD-PHR</h1><p>Card not found.</p>
                </body></html>
            `);
        }

        res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MCARD-PHR Emergency — ${escapeHtml(row.full_name)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;display:flex;justify-content:center;align-items:center;
       padding:20px;font-family:'Segoe UI',Arial,sans-serif;
       background:linear-gradient(135deg,#F0FFF0 0%,#fff 100%)}
  .card{width:100%;max-width:520px;background:#fff;padding:40px 32px;border-radius:28px;
        box-shadow:0 20px 60px rgba(46,139,87,.18);text-align:center}
  .icon{width:80px;height:80px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;
        border-radius:50%;background:linear-gradient(135deg,#DC3545,#ff5e6c);color:#fff;
        font-size:36px;font-weight:bold;box-shadow:0 12px 30px rgba(220,53,69,.35)}
  h1{color:#2E8B57;margin-bottom:6px;font-size:1.5rem}
  .subtitle{color:#687a74;font-size:.85rem;margin-bottom:24px}
  .patient{font-size:1.6rem;font-weight:800;margin:20px 0;color:#17322a}
  .unique-id{display:inline-block;padding:8px 16px;background:#F0FFF0;color:#2E8B57;
             border-radius:999px;font-family:monospace;font-size:.85rem;font-weight:700;
             letter-spacing:.08em;margin-bottom:20px;border:1px solid #d6f0de}
  .contact{padding:22px;background:#FFF8F0;border-radius:18px;margin-top:20px;border:1px solid #ffe4c4}
  .label{font-size:.72rem;color:#a06a00;text-transform:uppercase;letter-spacing:.08em;
         margin-bottom:8px;font-weight:700}
  .value{font-size:1.15rem;font-weight:700;color:#17322a;margin-bottom:4px}
  .value.small{font-size:.95rem;font-weight:600;color:#687a74}
  .call{display:inline-flex;align-items:center;gap:8px;margin-top:22px;padding:14px 28px;
        border-radius:14px;background:linear-gradient(135deg,#2E8B57,#46b878);color:#fff;
        text-decoration:none;font-weight:700;box-shadow:0 10px 24px rgba(46,139,87,.3)}
  .footer{margin-top:28px;color:#aabbb4;font-size:.75rem}
</style>
</head>
<body>
<div class="card">
  <div class="icon">!</div>
  <h1>MCARD-PHR Emergency</h1>
  <p class="subtitle">Emergency contact information</p>
  <div class="patient">${escapeHtml(row.full_name)}</div>
  <div class="unique-id">ID: ${escapeHtml(row.mcard_id)}</div>
  <div class="contact">
    <div class="label">Emergency Contact</div>
    <div class="value">${escapeHtml(row.emergency_contact_name || "—")}</div>
    <div class="value small">${escapeHtml(row.emergency_contact_number || "—")}</div>
  </div>
  ${row.emergency_contact_number ? `
    <a class="call" href="tel:${escapeHtml(row.emergency_contact_number)}">
      📞 Call Emergency Contact
    </a>` : ""}
  <div class="footer">Your Health, Our Responsibility</div>
</div>
</body>
</html>`);
    } catch (err) {
        console.error("Emergency page error:", err);
        res.status(500).send("Server error");
    }
});

module.exports = router;