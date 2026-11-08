
<div align="center">

# 🏥 MCARD-PHR

**A Unified, Multi-Portal Health Record Management System**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

*Bridging the gap between patients, doctors, and pharmacies through a single, portable health identity.*

</div>

---

## 📖 Overview

**MCARD-PHR** is a full-stack, multi-portal web application designed to digitize and organize personal health records. It solves the fragmentation of medical data by providing a unified platform for four distinct user roles:

1. **Patients** - Track medicines, upload prescriptions, log vitals, and manage appointments.
2. **Doctors** - Receive direct appointment requests, manage patient histories, and issue digital prescriptions.
3. **Pharmacies** - Look up patients instantly via their MCard ID, verify prescriptions, and log dispensed medications.
4. **Administrators** - Manage platform access, approve accounts, and monitor system activity.

The core of the system is the **MCard** — a unique, portable health ID (format: `YYYY-MM-LAST6PHONE`) that acts as a physical and digital key to a patient's entire medical history.

---

## ✨ Key Features

### 🆔 The MCard Identity System
*   **Unique ID Generation:** Auto-generated IDs based on the patient's birth month and mobile number.
*   **Printable PDF:** Generates a sleek, credit-card-sized PDF with a 3D-text design, patient photo, and QR code.
*   **Emergency QR:** Scanning the card's QR code opens a public emergency page displaying critical contact info without requiring a login.

### 👤 Patient Portal
*   **Medicine Tracker:** Schedule daily doses (Morning/Noon/Night) and track remaining pills with interactive checkboxes.
*   **Report Management:** Upload multiple prescription and test report images; view and print them securely.
*   **Health Trends:** Log vitals (BP, blood sugar, weight, etc.) and visualize them using Chart.js.
*   **AI Assistant:** Built-in Gemini AI chatbot (with an offline rule-based fallback) for querying personal health data via text or voice.

### 🩺 Doctor Portal
*   **Appointment Requests:** Receive incoming requests from patients. Accept with a proposed time or reject with feedback.
*   **Patient Management:** View a directory of all patients, their visit history, and past prescriptions.
*   **Digital Prescriptions:** Write and store prescriptions that instantly reflect on the patient's dashboard.

### 💊 Pharmacy Portal
*   **MCard Lookup:** Search for any patient using their unique MCard ID to see active prescriptions.
*   **Dispense Logging:** Record dispensed medicines, including substitutions or "out of stock" reasons.
*   **Inventory Management:** Track stock categorized into "Normal" and "Special" medicines.

### 🛡️ Admin Portal
*   **Approval Workflows:** Review and approve new doctors, pharmacies, and patients.
*   **Full Oversight:** Search, edit, disable, or delete any account across the platform.

---

## 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express.js, `express-session`, `connect-pg-simple` |
| **Database** | PostgreSQL (Supabase compatible) |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| **Authentication**| `bcryptjs` (Password hashing), Cookie-based sessions |
| **File Uploads** | `multer` |
| **PDF / QR** | `pdf-lib`, `qrcode` |
| **Charts / Maps** | Chart.js, Leaflet.js |
| **AI / Voice** | Google Gemini (`@google/genai`), Web Speech API |
| **i18n** | Custom translation engine (English & Bengali) |

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v18 or higher)
*   **PostgreSQL** (v12 or higher) running locally or remotely (e.g., Supabase)
*   *(Optional)* A Google Gemini API Key for AI features.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/mcard-phr.git
   cd mcard-phr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example file and fill in your details:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/mcardphr
   DATABASE_SSL=false
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=super_secret_long_string_here
   GEMINI_API_KEY=your_google_gemini_api_key (optional)
   ```

4. **Initialize the Database:**
   ```bash
   # Create the database in PostgreSQL first, then run:
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the Application:**
   ```bash
   npm start
   ```

### 🔑 Default Credentials
After running `npm run db:seed`, a default administrator account is created.
*   **URL:** `http://localhost:3000`
*   **Username:** `admin`
*   **Password:** `admin`
*(⚠️ You will be prompted to change this immediately upon first login).*

---

## 📂 Project Structure

```text
mcard-phr/
├── routes/                  # Express route handlers
│   ├── auth.js              # Login, Register, Session logic
│   ├── patient.js           # Patient-specific APIs
│   ├── doctor.js            # Doctor-specific APIs
│   ├── pharmacy.js          # Pharmacy-specific APIs
│   ├── admin.js             # Admin-specific APIs
│   ├── mcard.js             # PDF generation & QR endpoints
│   ├── public-api.js        # Unauthenticated endpoints
│   └── chat.js              # Gemini AI + Offline Fallback logic
├── public/                  # Frontend assets
│   ├── index.html           # Patient & Admin Shell
│   ├── doctor.html          # Doctor Shell
│   ├── pharmacy.html        # Pharmacy Shell
│   ├── css/                 # (Optional) Split CSS if desired
│   ├── js/                  # (Optional) Split JS if desired
│   ├── styles.css           # Global styles & themes
│   ├── i18n.js              # English & Bengali translation engine
│   ├── sidebar.js           # Shared dynamic sidebar renderer
│   ├── app.js               # Patient / Admin SPA logic
│   ├── doctor.js            # Doctor SPA logic
│   └── pharmacy.js          # Pharmacy SPA logic
├── uploads/                 # User-uploaded images (ignored in git)
├── db.js                    # PostgreSQL connection pool
├── mcard.js                 # MCard ID generator utility
├── schema.sql               # Full database schema
├── create-admin.js          # Interactive CLI for super admins
├── server.js                # Express app entry point
└── package.json
```

---

## 🔒 Security & Production Notes

This application was built as a comprehensive prototype. Before deploying to production, the following must be addressed:

*   **CSRF Protection:** Implement CSRF tokens for all state-changing requests.
*   **HTTPS:** Ensure `NODE_ENV=production` and deploy behind a reverse proxy (e.g., Nginx) with SSL.
*   **File Validation:** Validate uploaded files by content (magic bytes), not just MIME type.
*   **Storage:** Move uploaded files to secure cloud storage (AWS S3, Cloudinary) instead of local disk.
*   **Rate Limiting:** Add `express-rate-limit` to auth and AI endpoints.
*   **HIPAA/GDPR:** Ensure compliance with local health data privacy laws.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the project.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <i>Built with ❤️ for accessible healthcare.</i>
</div>
