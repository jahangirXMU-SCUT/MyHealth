// ============================================================
// MCARD-PHR PATIENT SPA
// ============================================================

let currentUser = null;
let appointmentsCache = [];
let medicinesCache = [];
let doctorsCache = [];
let metricsChartInstance = null;
let currentMetricType = "blood_pressure_systolic";
let currentRangeDays = 7;
let chatHistory = [];
let chatOpen = false;

const $ = id => document.getElementById(id);
const escapeHtml = s => String(s ?? "").replace(
    /[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])
);

function toast(msg, type = "success") {
    const container = $("toastContainer");
    if (!container) return alert(msg);
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}"></i>${escapeHtml(msg)}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

async function api(url, options = {}) {
    const res = await fetch(url, { credentials: "include", ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed.");
    return data;
}

// ------------------------------------------------------------
// NAV
// ------------------------------------------------------------
function showPage(name) {
    // Guest routing
    if (!currentUser) {
        const guestAllowed = ["home", "login", "register", "doctorLogin", "doctorRegister", "pharmacyLogin", "pharmacyRegister"];
        if (!guestAllowed.includes(name)) name = "login";
    } else if (currentUser.isAdmin) {
        if (!name.startsWith("admin") && name !== "settings") name = "adminOverview";
    } else {
        // Logged-in patient
        if (name.startsWith("admin")) name = "patientHome";
        if (name === "home" || name === "login" || name === "register") name = "patientHome";
    }

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
    const page = document.getElementById(name + "Page");
    if (page) page.classList.add("active-page");

    setActiveSidebarLink(name);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Lazy load
    if (name === "patientHome" && currentUser) { loadHomeMedicines(); updateAvatar(); }
    if (name === "dashboard" && currentUser) loadDashboard();
    if (name === "reports") loadReportsPage();
    if (name === "addReport") loadAddReportPage();
    if (name === "appointments") loadAppointmentsPage();
    if (name === "doctors") loadDoctorsPage();
    if (name === "medicines") loadMedicinesPage();
    if (name === "trends") loadTrendsPage();
    if (name === "summary") loadSummaryPage();
    if (name === "mcard") loadMCardPage();
    if (name === "editProfile") loadEditProfile();
    if (name === "adminOverview") loadAdminOverview();
    if (name === "adminUsers") loadAdminUsers();
    if (name === "adminDoctors") loadAdminDoctors();
    if (name === "adminPharmacies") loadAdminPharmacies();
}
// ------------------------------------------------------------
// EDIT PROFILE
// ------------------------------------------------------------
async function loadEditProfile() {
    const panel = $("profileEditPanel");
    if (!panel) return;
    panel.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const data = await api("/api/patient/profile");
        const u = data.user;
        const initial = (u.fullName || "U").charAt(0).toUpperCase();
        const avatarSrc = u.profilePicture || "data:image/svg+xml;utf8," + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90">
               <rect width="100%" height="100%" fill="#2E8B57"/>
               <text x="50%" y="54%" font-size="44" font-family="Arial" fill="#fff"
                     text-anchor="middle" dominant-baseline="middle">${initial}</text>
             </svg>`
        );

        panel.innerHTML = `
            <div class="profile-preview">
                <img id="editAvatarPreview" src="${escapeHtml(avatarSrc)}" alt="Profile">
                <div class="profile-preview-info">
                    <h3>${escapeHtml(u.fullName || "")}</h3>
                    <p>${escapeHtml(u.email || "")}</p>
                    <p class="text-mono-xs mt-4">
                        MCard: ${escapeHtml(u.mcardId || "—")}
                    </p>
                </div>
            </div>

            <form id="editProfileForm">
                <div class="form-section-title"><i class="fa-solid fa-user"></i> Personal</div>
                <div class="form-grid">
                    <label>Full name <input id="epFullName" value="${escapeHtml(u.fullName || "")}" required></label>
                    <label>Mobile <input id="epMobile" value="${escapeHtml(u.mobile || "")}" required></label>
                    <label>Email <input id="epEmail" value="${escapeHtml(u.email || "")}" disabled></label>
                    <label>Date of birth <input id="epDob" type="date" value="${escapeHtml(u.dateOfBirth || "")}"></label>
                    <label>Blood group
                        <select id="epBlood">
                            <option value="">— Select —</option>
                            ${["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg =>
                                `<option ${u.bloodGroup === bg ? "selected" : ""}>${bg}</option>`
                            ).join("")}
                        </select>
                    </label>
                </div>

                <div class="form-section-title"><i class="fa-solid fa-location-dot"></i> Address</div>
                <div class="form-grid">
                    <label>Home address <textarea id="epHome" rows="2">${escapeHtml(u.homeAddress || "")}</textarea></label>
                    <label>Permanent address <textarea id="epPermanent" rows="2">${escapeHtml(u.permanentAddress || "")}</textarea></label>
                </div>

                <div class="form-section-title"><i class="fa-solid fa-notes-medical"></i> Medical</div>
                <div class="form-grid">
                    <label>Diseases <textarea id="epDiseases" rows="2">${escapeHtml(u.diseases || "")}</textarea></label>
                    <label>Allergies <textarea id="epAllergies" rows="2">${escapeHtml(u.allergies || "")}</textarea></label>
                    <label>Other diseases <textarea id="epOther" rows="2">${escapeHtml(u.otherDiseases || "")}</textarea></label>
                </div>

                <div class="form-section-title"><i class="fa-solid fa-phone-volume"></i> Emergency contact</div>
                <div class="form-grid">
                    <label>Name <input id="epEmName" value="${escapeHtml(u.emergencyContactName || "")}"></label>
                    <label>Number <input id="epEmNumber" value="${escapeHtml(u.emergencyContactNumber || "")}"></label>
                </div>

                <div class="form-section-title"><i class="fa-solid fa-image"></i> Profile picture</div>
                <label>Change picture (optional) <input id="epPicture" type="file" accept="image/*"></label>

                <button class="btn btn-primary mt-18" type="submit">
                    <i class="fa-solid fa-floppy-disk"></i> Save Changes
                </button>
            </form>
        `;

        // Live preview when file is chosen
        $("epPicture")?.addEventListener("change", e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => { $("editAvatarPreview").src = ev.target.result; };
            reader.readAsDataURL(file);
        });

        $("editProfileForm").onsubmit = async e => {
            e.preventDefault();
            const fd = new FormData();
            fd.append("fullName", $("epFullName").value.trim());
            fd.append("mobile", $("epMobile").value.trim());
            fd.append("dateOfBirth", $("epDob").value);
            fd.append("bloodGroup", $("epBlood").value);
            fd.append("homeAddress", $("epHome").value.trim());
            fd.append("permanentAddress", $("epPermanent").value.trim());
            fd.append("diseases", $("epDiseases").value.trim());
            fd.append("allergies", $("epAllergies").value.trim());
            fd.append("otherDiseases", $("epOther").value.trim());
            fd.append("emergencyContactName", $("epEmName").value.trim());
            fd.append("emergencyContactNumber", $("epEmNumber").value.trim());
            if ($("epPicture")?.files[0]) fd.append("profilePicture", $("epPicture").files[0]);

            try {
                await api("/api/patient/profile", { method: "PUT", body: fd });
                toast("Profile updated successfully.");
                // Refresh user object
                const fresh = await api("/api/me");
                if (fresh.user) {
                    currentUser = { ...fresh.user, isAdmin: false };
                    rebuildSidebar();
                    updateAvatar();
                }
                loadEditProfile();
            } catch (err) { toast(err.message, "error"); }
        };
    } catch (err) {
        panel.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i><span>${escapeHtml(err.message)}</span></div>`;
    }
}
function rebuildSidebar() {
    if (!currentUser) {
        const guestLinks = [
            { id: "home", icon: "fa-house", label: "Home" },
            { id: "login", icon: "fa-right-to-bracket", label: "Login" },
            { id: "register", icon: "fa-user-plus", label: "Create Account" },
            { id: "doctorLogin", icon: "fa-user-doctor", label: "Doctor Portal" },
            { id: "pharmacyLogin", icon: "fa-prescription-bottle-medical", label: "Pharmacy Portal" }
        ];
        renderSidebarCustom("MCARD-PHR", "Your Health, Our Responsibility", null, guestLinks);
        return;
    }

    const role = currentUser.isAdmin ? "admin" : "patient";
    renderSidebar({
        role,
        portalTitle: currentUser.isAdmin ? "MCARD-PHR Admin" : "MCARD-PHR",
        portalSubtitle: currentUser.isAdmin ? "Control Center" : "Your Health, Our Responsibility",
        user: currentUser
    });

    if (!currentUser.isAdmin) {
        showPage("patientHome");
        updateAvatar();
        loadHomeMedicines();
        refreshChatFabVisibility();
    } else {
        showPage("adminOverview");
    }
}

function renderSidebarCustom(title, subtitle, user, links) {
    const el = document.getElementById("sidebar");
    if (!el) return;

    el.innerHTML = `
        <div class="sidebar-brand">
            <span class="brand-logo"><i class="fa-solid fa-heart-pulse"></i></span>
            <div class="sidebar-brand-text">
                <strong>${escapeHtml(title)}</strong>
                <small>${escapeHtml(subtitle)}</small>
            </div>
        </div>
        ${user ? `
        <div class="sidebar-user">
            <div class="user-initial">${escapeHtml((user.fullName || "U")[0].toUpperCase())}</div>
            <div class="sidebar-user-info">
                <strong>${escapeHtml(user.fullName)}</strong>
                <small>${escapeHtml(user.mcardId || user.email || "")}</small>
            </div>
        </div>` : ""}
        <nav class="sidebar-nav">
            ${links.map(l => `
                <button class="sidebar-link" data-page="${l.id}" type="button">
                    <i class="fa-solid ${l.icon}"></i>
                    <span>${escapeHtml(l.label)}</span>
                </button>
            `).join("")}
        </nav>
        <div class="sidebar-footer">
            <button class="sidebar-link" data-action="toggle-theme" type="button">
                <i class="fa-solid fa-moon"></i><span>Dark mode</span>
            </button>
            ${user ? `
            <button class="sidebar-link" data-action="logout" type="button">
                <i class="fa-solid fa-right-from-bracket"></i><span>Logout</span>
            </button>` : ""}
        </div>
    `;

    el.querySelectorAll(".sidebar-link[data-page]").forEach(btn => {
        btn.addEventListener("click", () => showPage(btn.dataset.page));
    });
    el.querySelector('[data-action="toggle-theme"]')?.addEventListener("click", toggleDarkMode);
    el.querySelector('[data-action="logout"]')?.addEventListener("click", logout);
}

// ------------------------------------------------------------
// THEME + FONT
// ------------------------------------------------------------
function toggleDarkMode() {
    const isDark = document.body.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", !isDark);
    localStorage.setItem("mcardphr-theme", !isDark ? "dark" : "light");
    if ($("metricsChart")) loadMetricsChart();
}
function loadTheme() {
    const saved = localStorage.getItem("mcardphr-theme");
    if (saved === "dark") document.body.classList.add("dark-mode");
}

const FONT_SIZES = [0.9, 1.0, 1.1, 1.2, 1.3];
let fontSizeIndex = 1;
function applyFontSize() {
    document.documentElement.style.fontSize = `${FONT_SIZES[fontSizeIndex]}rem`;
    localStorage.setItem("mcardphr-font-size", fontSizeIndex);
    const d = $("fontSizeDisplay");
    if (d) d.textContent = ["Small", "Normal", "Large", "Extra large", "Maximum"][fontSizeIndex] + " font size";
}
function changeFontSize(d) {
    fontSizeIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, fontSizeIndex + d));
    applyFontSize();
}
function resetFontSize() { fontSizeIndex = 1; applyFontSize(); }
function loadFontSize() {
    const s = localStorage.getItem("mcardphr-font-size");
    if (s !== null) {
        const i = parseInt(s, 10);
        if (!isNaN(i) && i >= 0 && i < FONT_SIZES.length) fontSizeIndex = i;
    }
    applyFontSize();
}

function applyProgressBars(root = document) {
    (root || document).querySelectorAll("[data-progress]").forEach(el => {
        el.style.width = `${el.getAttribute("data-progress") || 0}%`;
    });
}

// ------------------------------------------------------------
// AVATAR
// ------------------------------------------------------------
function updateAvatar() {
    if (!currentUser || currentUser.isAdmin) return;
    const initial = (currentUser.fullName || "U").charAt(0).toUpperCase();
    const fallback = "data:image/svg+xml;utf8," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
           <rect width="100%" height="100%" fill="#2E8B57"/>
           <text x="50%" y="54%" font-size="38" font-family="Arial" fill="#fff"
                 text-anchor="middle" dominant-baseline="middle">${initial}</text>
         </svg>`
    );
    const src = currentUser.profilePicture || fallback;

    // Update every avatar element that exists
    ["dashboardAvatar", "homeAvatar"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = src;
    });

    // Update the patient home hero text
    const homeWelcome = document.getElementById("homeWelcome");
    if (homeWelcome) {
        homeWelcome.textContent = `Welcome back, ${currentUser.fullName || "User"}!`;
    }

    // Update MCard badge in the hero
    const badge = document.getElementById("homeMcardBadge");
    if (badge) {
        const span = badge.querySelector("span");
        if (span) span.textContent = currentUser.mcardId || "MCard pending";
    }

    // Update the dashboard welcome (separate element)
    const dashWelcome = document.getElementById("welcomeTitle");
    if (dashWelcome && document.getElementById("dashboardPage")?.classList.contains("active-page")) {
        dashWelcome.textContent = `Welcome, ${currentUser.fullName || "User"}`;
    }
}

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------
function initAuthForms() {
    $("loginForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        try {
            const data = await api("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: $("loginIdentifier").value.trim(),
                    password: $("loginPassword").value
                })
            });
            currentUser = { ...data.user, isAdmin: data.role === "admin" };
            rebuildSidebar();
            toast(`Welcome, ${currentUser.fullName || currentUser.username}!`);
        } catch (err) { toast(err.message, "error"); }
    });

    $("registerForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const fd = new FormData();
        ["fullName", "mobile", "email", "dateOfBirth", "bloodGroup",
         "homeAddress", "permanentAddress", "diseases", "emergencyName",
         "emergencyNumber"].forEach(id => {
            const el = $(id);
            if (!el) return;
            const key = id === "emergencyName" ? "emergencyContactName"
                      : id === "emergencyNumber" ? "emergencyContactNumber"
                      : id;
            fd.append(key, el.value.trim());
        });
        fd.append("password", $("registerPassword").value);
        if ($("profilePicture")?.files[0]) fd.append("profilePicture", $("profilePicture").files[0]);

        try {
            const data = await api("/api/register", { method: "POST", body: fd });
            toast(data.message);
            e.target.reset();
            showPage("login");
        } catch (err) { toast(err.message, "error"); }
    });

    $("doctorLoginForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        try {
            const data = await api("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: $("docLoginEmail").value.trim(),
                    password: $("docLoginPassword").value,
                    role: "doctor"
                })
            });
            // Redirect to doctor portal
            setTimeout(() => { window.location.href = "/doctor"; }, 150);
        } catch (err) { toast(err.message, "error"); }
    });

    $("doctorRegisterForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const fd = new FormData();
        fd.append("fullName", $("drFullName").value.trim());
        fd.append("email", $("drEmail").value.trim());
        fd.append("password", $("drPassword").value);
        fd.append("degree", $("drDegree").value.trim());
        fd.append("profession", $("drProfession").value.trim());
        fd.append("specialization", $("drSpecialization").value.trim());
        fd.append("lastWorkedPlace", $("drLastWorked").value.trim());
        fd.append("experienceYears", $("drExperience").value);
        fd.append("licenseNumber", $("drLicense").value.trim());
        fd.append("consultationFee", $("drFee").value);
        fd.append("bio", $("drBio").value.trim());
        if ($("drPicture")?.files[0]) fd.append("profilePicture", $("drPicture").files[0]);

        try {
            const data = await api("/api/doctor/register", { method: "POST", body: fd });
            toast(data.message);
            e.target.reset();
            showPage("doctorLogin");
        } catch (err) { toast(err.message, "error"); }
    });

    $("pharmacyLoginForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        try {
            await api("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: $("phLoginEmail").value.trim(),
                    password: $("phLoginPassword").value,
                    role: "pharmacy"
                })
            });
            setTimeout(() => { window.location.href = "/pharmacy"; }, 150);
        } catch (err) { toast(err.message, "error"); }
    });

    $("pharmacyRegisterForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const fd = new FormData();
        fd.append("pharmacyName", $("phName").value.trim());
        fd.append("email", $("phEmail").value.trim());
        fd.append("password", $("phPassword").value);
        fd.append("licenseNumber", $("phLicense").value.trim());
        fd.append("phone", $("phPhone").value.trim());
        fd.append("address", $("phAddress").value.trim());

        try {
            const data = await api("/api/pharmacy/register", { method: "POST", body: fd });
            toast(data.message);
            e.target.reset();
            showPage("pharmacyLogin");
        } catch (err) { toast(err.message, "error"); }
    });
}

async function logout() {
    try { await api("/api/logout", { method: "POST" }); } catch {}
    window.location.href = "/";
}

// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------
function loadDashboard() {
    if (!currentUser) return;
    if ($("welcomeTitle")) $("welcomeTitle").textContent = `Welcome, ${currentUser.fullName || "User"}`;
    if ($("approvalText")) $("approvalText").textContent = "Your account is approved. Keep your info up to date.";
    if ($("userIdText")) $("userIdText").textContent = "MCard: " + (currentUser.mcardId || "—");
    loadCompleteness();
    loadHomeMedicines();
}

async function loadCompleteness() {
    const el = $("profileCompleteness");
    if (!el) return;
    try {
        const data = await api("/api/patient/profile/completeness");
        const c = data.completeness;
        const badgeClass = c.percent >= 80 ? "badge-percent-high" : c.percent >= 50 ? "badge-percent-mid" : "badge-percent-low";
        const fillClass = c.percent >= 80 ? "progress-fill-high" : c.percent >= 50 ? "progress-fill-mid" : "progress-fill-low";
        el.innerHTML = `
            <div class="panel">
                <div class="panel-heading">
                    <h3><i class="fa-solid fa-chart-line"></i> Profile completeness</h3>
                    <span class="badge ${badgeClass}">${c.percent}%</span>
                </div>
                <div class="medicine-progress-bg">
                    <div class="medicine-progress-fill ${fillClass}" data-progress="${c.percent}"></div>
                </div>
                ${c.missing.length > 0 ? `
                    <div class="notice mt-14">
                        <i class="fa-solid fa-circle-info"></i>
                        <div>
                            <strong>To reach 100%, add:</strong>
                            <ul class="mt-6 ml-18">
                                ${c.missing.map(m => `<li>${escapeHtml(m)}</li>`).join("")}
                            </ul>
                        </div>
                    </div>
                ` : ""}
            </div>
        `;
        applyProgressBars(el);
    } catch {}
}

// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------
async function loadReportsPage() {
    const panel = $("reportsPanel");
    if (!panel) return;
    panel.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const data = await api("/api/patient/reports");
        const reports = data.reports || [];
        if (reports.length === 0) {
            panel.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i>
                <span>No reports yet. <button class="text-btn" onclick="showPage('addReport')">Add your first report</button></span></div>`;
            return;
        }
        panel.innerHTML = `<div class="report-grid">${reports.map(renderReportCard).join("")}</div>`;
    } catch (err) { toast(err.message, "error"); }
}

function renderReportCard(r) {
    const pres = r.prescriptionImages || [];
    const tests = r.testReportImages || [];
    const first = pres[0]?.filePath || "";
    return `
        <article class="report-card">
            <div class="report-thumb-wrap">
                ${first ? `<a href="${escapeHtml(first)}" target="_blank"><img src="${escapeHtml(first)}" alt=""></a>` : ""}
                <span class="report-thumb-badge"><i class="fa-solid fa-file-prescription"></i> ${pres.length} prescription${pres.length !== 1 ? "s" : ""}</span>
            </div>
            <div class="report-content">
                <h4>${escapeHtml(r.doctorName)}</h4>
                <p><b>Date:</b> ${escapeHtml(r.appointmentDate || "")}</p>
                ${r.testResults ? `<p><b>Results:</b> ${escapeHtml(r.testResults.slice(0, 100))}${r.testResults.length > 100 ? "…" : ""}</p>` : ""}
                ${tests.length > 0 ? `
                    <div class="test-thumbs">
                        <small><i class="fa-solid fa-vial"></i> ${tests.length} test image${tests.length !== 1 ? "s" : ""}</small>
                        <div class="test-thumbs-grid">
                            ${tests.slice(0, 4).map(t => `<a href="${escapeHtml(t.filePath)}" target="_blank"><img src="${escapeHtml(t.filePath)}"></a>`).join("")}
                        </div>
                    </div>` : ""}
                <div class="flex-row-gap-8">
                    <button class="table-btn" onclick="printReport('${r.id}')"><i class="fa-solid fa-print"></i> Print</button>
                    <button class="table-btn remove" onclick="deleteReport('${r.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>
        </article>`;
}

async function deleteReport(id) {
    if (!confirm("Delete this report?")) return;
    try {
        await api(`/api/patient/reports/${id}`, { method: "DELETE" });
        toast("Report deleted.");
        loadReportsPage();
    } catch (err) { toast(err.message, "error"); }
}

function printReport(id) { window.open(`/api/patient/print/report/${id}`, "_blank"); }

function loadAddReportPage() {
    const panel = $("reportFormPanel");
    if (!panel) return;
    panel.innerHTML = `
        <form id="addReportForm">
            <div class="form-grid">
                <label>Doctor name <input id="doctorName" required></label>
                <label>Appointment date <input id="appointmentDate" type="date" required></label>
                <label>Prescription images (max 10)
                    <input id="prescriptionImages" type="file" accept="image/*" multiple required>
                </label>
                <label>Test report images (max 20)
                    <input id="testReportImages" type="file" accept="image/*" multiple>
                </label>
                <label class="col-span-full">Test results
                    <textarea id="testResults" rows="4"></textarea>
                </label>
            </div>
            <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Report</button>
        </form>`;

    $("addReportForm").onsubmit = async e => {
        e.preventDefault();
        const pres = Array.from($("prescriptionImages").files || []);
        const tests = Array.from($("testReportImages").files || []);
        if (pres.length === 0) return toast("Select at least one prescription image.", "error");
        if (pres.length > 10) return toast("Max 10 prescription images.", "error");
        if (tests.length > 20) return toast("Max 20 test images.", "error");

        const fd = new FormData();
        fd.append("doctorName", $("doctorName").value.trim());
        fd.append("appointmentDate", $("appointmentDate").value);
        fd.append("testResults", $("testResults").value.trim());
        pres.forEach(f => fd.append("prescriptionImages", f));
        tests.forEach(f => fd.append("testReportImages", f));

        try {
            await api("/api/patient/reports", { method: "POST", body: fd });
            toast("Report saved.");
            showPage("reports");
        } catch (err) { toast(err.message, "error"); }
    };
}

// ------------------------------------------------------------
// APPOINTMENTS
// ------------------------------------------------------------
async function loadAppointmentsPage() {
    const panel = $("appointmentsPanel");
    if (!panel) return;
    panel.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const data = await api("/api/patient/appointments");
        appointmentsCache = data.appointments || [];
        if (appointmentsCache.length === 0) {
            panel.innerHTML = `<div class="notice"><i class="fa-solid fa-calendar-plus"></i>
                <span>No appointments. <button class="text-btn" onclick="openAddAppointment()">Add a reminder</button> or
                <button class="text-btn" onclick="showPage('doctors')">request a doctor</button></span></div>`;
            return;
        }

        panel.innerHTML = `<div class="appointment-list">
            ${appointmentsCache.map(a => renderAppointmentCard(a)).join("")}
        </div>`;
    } catch (err) { toast(err.message, "error"); }
}

function renderAppointmentCard(a) {
    const date = a.date ? new Date(a.date + "T00:00:00") : null;
    const month = date ? date.toLocaleString("en-US", { month: "short" }) : "—";
    const day = date ? date.getDate() : "—";
    const formatted = date ? date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "—";

    const statusClass = a.status;
    const statusLabel = { requested: "Awaiting doctor", confirmed: "Confirmed", rejected: "Rejected", completed: "Completed" }[a.status] || a.status;

    return `
        <div class="appointment-card">
            <div class="appointment-date-badge">
                <span class="apt-month">${month}</span>
                <span class="apt-day">${day}</span>
            </div>
            <div class="appointment-info">
                <h4>${escapeHtml(a.doctorName)} <span class="status ${statusClass} status-pill-sub">${statusLabel}</span></h4>
                <p><i class="fa-solid fa-calendar"></i> ${escapeHtml(formatted)} ${a.time ? "· " + escapeHtml(a.time) : ""}</p>
                ${a.location ? `<p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(a.location)}</p>` : ""}
                ${a.reason ? `<p><i class="fa-solid fa-comment"></i> Reason: ${escapeHtml(a.reason)}</p>` : ""}
                ${a.doctorFeedback ? `<p><i class="fa-solid fa-reply"></i> Doctor: ${escapeHtml(a.doctorFeedback)}</p>` : ""}
            </div>
            <div class="appointment-actions">
                <button class="table-btn remove" onclick="deleteAppointment('${a.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
}

function openAddAppointment() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>Add personal reminder</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="addApptForm">
                <label>Doctor/place name <input id="aptDoctor" required></label>
                <div class="form-grid">
                    <label>Date <input id="aptDate" type="date" required></label>
                    <label>Time <input id="aptTime" type="time"></label>
                </div>
                <label>Location <input id="aptLocation"></label>
                <label>Notes <textarea id="aptNotes" rows="2"></textarea></label>
                <button class="btn btn-primary full mt-14" type="submit">Save</button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    $("addApptForm").onsubmit = async e => {
        e.preventDefault();
        try {
            await api("/api/patient/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doctorName: $("aptDoctor").value.trim(),
                    date: $("aptDate").value,
                    time: $("aptTime").value,
                    location: $("aptLocation").value.trim(),
                    notes: $("aptNotes").value.trim()
                })
            });
            toast("Reminder added.");
            overlay.remove();
            loadAppointmentsPage();
        } catch (err) { toast(err.message, "error"); }
    };
}

async function deleteAppointment(id) {
    if (!confirm("Delete this appointment?")) return;
    try {
        await api(`/api/patient/appointments/${id}`, { method: "DELETE" });
        toast("Deleted.");
        loadAppointmentsPage();
    } catch (err) { toast(err.message, "error"); }
}

// ------------------------------------------------------------
// DOCTORS (patient browsing)
// ------------------------------------------------------------
async function loadDoctorsPage() {
    const wrap = $("doctorsList");
    if (!wrap) return;
    wrap.innerHTML = `<div class="loading-box full-col">
        <i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const search = $("doctorSearchInput")?.value.trim() || "";
        const qs = search ? `?search=${encodeURIComponent(search)}` : "";
        const data = await api("/api/public/doctors" + qs);
        doctorsCache = data.doctors || [];

        if (doctorsCache.length === 0) {
            wrap.innerHTML = `<div class="notice col-span-full">
                <i class="fa-solid fa-circle-info"></i><span>No doctors found.</span></div>`;
            return;
        }

        wrap.innerHTML = doctorsCache.map(d => `
            <div class="doctor-card">
                ${d.profilePicture
                    ? `<img src="${escapeHtml(d.profilePicture)}" alt="">`
                    : `<div class="doctor-initial">${escapeHtml(d.fullName[0])}</div>`}
                <h3>${escapeHtml(d.fullName)}</h3>
                <div class="specialty">${escapeHtml(d.specialization || d.profession || "")}</div>
                <div class="degree">${escapeHtml(d.degree || "")}</div>
                ${d.consultationFee != null ? `<div class="fee">Fee: ${d.consultationFee}</div>` : ""}
                ${d.bio ? `<p class="text-muted-xs mb-12">${escapeHtml(d.bio.slice(0, 100))}</p>` : ""}
                <button class="btn btn-primary full" onclick="openDoctorRequest('${d.id}')">
                    <i class="fa-solid fa-calendar-plus"></i> Request Appointment
                </button>
            </div>
        `).join("");
    } catch (err) { toast(err.message, "error"); }
}

function openDoctorRequest(doctorId) {
    const doctor = doctorsCache.find(d => d.id === doctorId);
    if (!doctor) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>Request — ${escapeHtml(doctor.fullName)}</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="requestForm">
                <label>Preferred date <input id="reqDate" type="date" required></label>
                <label>Preferred time <input id="reqTime" type="time"></label>
                <label>Reason for visit <textarea id="reqReason" rows="3" required></textarea></label>
                <button class="btn btn-primary full mt-14" type="submit">
                    <i class="fa-solid fa-paper-plane"></i> Send Request
                </button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    $("requestForm").onsubmit = async e => {
        e.preventDefault();
        try {
            await api("/api/patient/appointments/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doctorId: doctor.id,
                    date: $("reqDate").value,
                    time: $("reqTime").value,
                    reason: $("reqReason").value.trim()
                })
            });
            toast("Request sent to doctor.");
            overlay.remove();
            showPage("appointments");
        } catch (err) { toast(err.message, "error"); }
    };
}

// Search input on doctors page
document.addEventListener("DOMContentLoaded", () => {
    $("doctorSearchInput")?.addEventListener("input", debounce(loadDoctorsPage, 300));
});

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ------------------------------------------------------------
// MEDICINES
// ------------------------------------------------------------
async function loadMedicinesPage() {
    const tl = $("todayList"), al = $("medicinesList");
    if (!tl || !al) return;

    tl.innerHTML = `<div class="loading-box compact"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
    al.innerHTML = `<div class="loading-box compact"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const [all, today] = await Promise.all([
            api("/api/patient/medicines"),
            api("/api/patient/medicines/today")
        ]);
        medicinesCache = all.medicines || [];
        renderTodayList(today.today || [], medicinesCache);
        renderAllMedicines(medicinesCache);
    } catch (err) { toast(err.message, "error"); }
}

function renderTodayList(list, all) {
    const wrap = $("todayList");
    if (!wrap) return;
    if ($("todayCountBadge")) $("todayCountBadge").textContent = list.length;

    if (list.length === 0) {
        wrap.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i>
            <span>No medicines scheduled for today.</span></div>`;
        return;
    }
    const byId = new Map(all.map(m => [m.id, m]));
    wrap.innerHTML = list.map(m => renderTodayCard(m, byId.get(m.id))).join("");
    applyProgressBars(wrap);
}

function renderTodayCard(m, detail) {
    const slots = [
        { key: "morning", label: "Morning", count: m.dosageMorning },
        { key: "noon", label: "Noon", count: m.dosageNoon },
        { key: "night", label: "Night", count: m.dosageNight }
    ].filter(s => s.count > 0);

    const totalPills = detail?.totalPills ?? (m.dosageMorning + m.dosageNoon + m.dosageNight) * m.durationDays;
    const takenTotal = detail?.takenTotal ?? 0;
    const remaining = detail?.remainingTotal ?? Math.max(0, totalPills - takenTotal);
    const percent = totalPills === 0 ? 0 : Math.min(100, Math.round(takenTotal / totalPills * 100));
    const allTaken = slots.every(s => m.takenSlots.includes(s.key));

    return `
        <div class="medicine-card ${allTaken ? "complete" : ""}">
            <div class="medicine-head">
                <div class="medicine-title">
                    <div class="medicine-icon"><i class="fa-solid fa-pills"></i></div>
                    <div>
                        <div class="medicine-name">${escapeHtml(m.name)}</div>
                        <div class="medicine-sub">Day ${m.dayNumber} of ${m.durationDays}</div>
                    </div>
                </div>
                ${allTaken ? `<span class="medicine-tag active"><i class="fa-solid fa-check"></i> Complete</span>` : ""}
            </div>
            <div class="medicine-progress">
                <div class="medicine-progress-label">
                    <span>${takenTotal} / ${totalPills} pills (${percent}%)</span>
                    <span><b>${remaining}</b> left</span>
                </div>
                <div class="medicine-progress-bg"><div class="medicine-progress-fill" data-progress="${percent}"></div></div>
            </div>
            <div class="medicine-dosage-grid">
                ${slots.map(s => {
                    const c = m.takenSlots.includes(s.key);
                    return `
                        <label class="dosage-slot ${c ? "checked" : ""}">
                            <input type="checkbox" ${c ? "checked" : ""}
                                   onchange="toggleMedicineSlot('${m.id}', '${s.key}', this.checked)">
                            <div class="dosage-slot-label">
                                <strong>${s.label}</strong>
                                <small>${s.count} pill${s.count !== 1 ? "s" : ""}</small>
                            </div>
                        </label>`;
                }).join("")}
            </div>
        </div>`;
}

function renderAllMedicines(list) {
    const wrap = $("medicinesList");
    if (!wrap) return;
    if ($("medicinesCountBadge")) $("medicinesCountBadge").textContent = list.length;

    if (list.length === 0) {
        wrap.innerHTML = `<div class="notice"><i class="fa-solid fa-pills"></i>
            <span>No medicines yet.</span></div>`;
        return;
    }

    wrap.innerHTML = list.map(m => {
        const percent = m.totalPills === 0 ? 0 : Math.min(100, Math.round(m.takenTotal / m.totalPills * 100));
        const dosageLine = [
            m.dosageMorning ? `Morning: ${m.dosageMorning}` : null,
            m.dosageNoon ? `Noon: ${m.dosageNoon}` : null,
            m.dosageNight ? `Night: ${m.dosageNight}` : null
        ].filter(Boolean).join(" · ");

        return `
            <div class="medicine-card ${m.isActive ? "" : "inactive"}">
                <div class="medicine-head">
                    <div class="medicine-title">
                        <div class="medicine-icon"><i class="fa-solid fa-capsules"></i></div>
                        <div>
                            <div class="medicine-name">${escapeHtml(m.name)}</div>
                            <div class="medicine-sub">${escapeHtml(dosageLine)}</div>
                            <div class="medicine-tags">
                                <span class="medicine-tag">${m.durationDays} days</span>
                                <span class="medicine-tag">Starts ${escapeHtml(m.startDate)}</span>
                                <span class="medicine-tag ${m.isActive ? "active" : ""}">${m.isActive ? "Active" : "Inactive"}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="medicine-progress">
                    <div class="medicine-progress-label">
                        <span>${m.takenTotal} / ${m.totalPills} pills (${percent}%)</span>
                        <span><b>${m.remainingTotal}</b> left</span>
                    </div>
                    <div class="medicine-progress-bg"><div class="medicine-progress-fill" data-progress="${percent}"></div></div>
                </div>
                <div class="medicine-actions">
                    <button class="table-btn remove" onclick="deleteMedicine('${m.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>`;
    }).join("");
    applyProgressBars(wrap);
}

async function toggleMedicineSlot(id, slot, taken) {
    const today = new Date().toISOString().split("T")[0];
    try {
        await api(`/api/patient/medicines/${id}/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: today, slot, taken })
        });

        // Refresh the currently active page
        const activePage = document.querySelector(".page.active-page");
        if (activePage) {
            const id = activePage.id;
            if (id === "patientHomePage") await loadHomeMedicines();
            if (id === "medicinesPage") await loadMedicinesPage();
            if (id === "dashboardPage") await loadDashboard();
        }
    } catch (err) {
        toast(err.message, "error");
        // On error, reload current page state
        const activePage = document.querySelector(".page.active-page");
        if (activePage?.id === "patientHomePage") loadHomeMedicines();
        if (activePage?.id === "medicinesPage") loadMedicinesPage();
    }
}

async function deleteMedicine(id) {
    if (!confirm("Delete this medicine?")) return;
    try {
        await api(`/api/patient/medicines/${id}`, { method: "DELETE" });
        toast("Deleted.");
        loadMedicinesPage();
    } catch (err) { toast(err.message, "error"); }
}

function openAddMedicine() {
    const today = new Date().toISOString().split("T")[0];
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>Add Medicine</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="addMedForm">
                <label>Medicine name <input id="mName" required></label>
                <div class="form-grid">
                    <label>Morning pills <input id="mMorn" type="number" min="0" value="1"></label>
                    <label>Noon pills <input id="mNoon" type="number" min="0" value="0"></label>
                    <label>Night pills <input id="mNight" type="number" min="0" value="0"></label>
                    <label>Start date <input id="mStart" type="date" value="${today}"></label>
                    <label>Duration (days) <input id="mDays" type="number" min="1" value="7" required></label>
                </div>
                <label>Notes <textarea id="mNotes" rows="2"></textarea></label>
                <button class="btn btn-primary full mt-14" type="submit">Save</button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    $("addMedForm").onsubmit = async e => {
        e.preventDefault();
        try {
            await api("/api/patient/medicines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: $("mName").value.trim(),
                    dosageMorning: parseInt($("mMorn").value) || 0,
                    dosageNoon: parseInt($("mNoon").value) || 0,
                    dosageNight: parseInt($("mNight").value) || 0,
                    startDate: $("mStart").value,
                    durationDays: parseInt($("mDays").value),
                    notes: $("mNotes").value.trim()
                })
            });
            toast("Medicine added.");
            overlay.remove();
            loadMedicinesPage();
            loadHomeMedicines();
        } catch (err) { toast(err.message, "error"); }
    };
}

async function loadHomeMedicines() {
    const box = $("homeMedsBox"), list = $("homeMedsList");
    if (!box || !list || !currentUser || currentUser.isAdmin) return;

    // Always show the box on the patient home page
    box.classList.remove("hidden");

    // Show loading state
    list.innerHTML = `<div class="loading-box compact full-col">
        <i class="fa-solid fa-spinner fa-spin"></i>
    </div>`;

    try {
        const [today, all] = await Promise.all([
            api("/api/patient/medicines/today"),
            api("/api/patient/medicines")
        ]);

        const items = today.today || [];
        const byId = new Map((all.medicines || []).map(m => [m.id, m]));

        // Count pending
        const pendingItems = items.filter(m => {
            const slots = [];
            if (m.dosageMorning > 0) slots.push("morning");
            if (m.dosageNoon > 0) slots.push("noon");
            if (m.dosageNight > 0) slots.push("night");
            return slots.some(s => !m.takenSlots.includes(s));
        });

        if ($("homeMedsTitle")) {
            if (items.length === 0) {
                $("homeMedsTitle").innerHTML = `No medicines scheduled for today 🎉`;
            } else if (pendingItems.length === 0) {
                $("homeMedsTitle").innerHTML = `All ${items.length} medicine${items.length === 1 ? "" : "s"} taken for today 🎉`;
            } else {
                $("homeMedsTitle").innerHTML = `<span class="pending-count">${pendingItems.length}</span> of ${items.length} still pending`;
            }
        }

        if (items.length === 0) {
            list.innerHTML = `<div class="notice col-span-full">
                <i class="fa-solid fa-circle-info"></i>
                <span>No medicines scheduled. <button class="text-btn" onclick="showPage('medicines')">Add a medicine</button></span>
            </div>`;
            return;
        }

        list.innerHTML = items.map(m => {
            const detail = byId.get(m.id) || {};
            const totalPills = detail.totalPills ?? (m.dosageMorning + m.dosageNoon + m.dosageNight) * m.durationDays;
            const takenTotal = detail.takenTotal ?? 0;
            const remaining = detail.remainingTotal ?? Math.max(0, totalPills - takenTotal);
            const percent = totalPills === 0 ? 0 : Math.min(100, Math.round(takenTotal / totalPills * 100));

            const slots = [
                { key: "morning", label: "Morning", count: m.dosageMorning },
                { key: "noon", label: "Noon", count: m.dosageNoon },
                { key: "night", label: "Night", count: m.dosageNight }
            ].filter(s => s.count > 0);

            const allTaken = slots.every(s => m.takenSlots.includes(s.key));

            return `
                <div class="home-med-card ${allTaken ? "complete" : ""}">
                    <div class="home-med-top">
                        <div class="home-med-name">
                            <i class="fa-solid fa-pills"></i>${escapeHtml(m.name)}
                        </div>
                        <span class="home-med-day">Day ${m.dayNumber}/${m.durationDays}</span>
                    </div>

                    <div class="home-med-progress-label">
                        <span>${takenTotal} of ${totalPills} pills taken (${percent}%)</span>
                        <span><b>${remaining}</b> left</span>
                    </div>
                    <div class="home-med-progress-bg">
                        <div class="home-med-progress-fill" data-progress="${percent}"></div>
                    </div>

                    <div class="home-med-slots">
                        ${slots.map(s => {
                            const c = m.takenSlots.includes(s.key);
                            return `
                                <label class="home-slot ${c ? "checked" : ""}">
                                    <input type="checkbox" ${c ? "checked" : ""}
                                           onchange="toggleMedicineSlot('${m.id}', '${s.key}', this.checked)">
                                    <span>${s.label}</span>
                                    <span class="home-slot-count">(${s.count})</span>
                                </label>`;
                        }).join("")}
                    </div>
                </div>`;
        }).join("");
        applyProgressBars(list);

    } catch (err) {
        console.error("Home medicines error:", err);
        list.innerHTML = `<div class="notice col-span-full">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Could not load medicines. ${escapeHtml(err.message)}</span>
        </div>`;
    }
}
// ------------------------------------------------------------
// HEALTH TRENDS
// ------------------------------------------------------------
const METRIC_CONFIG = {
    blood_pressure_systolic: { label: "BP Systolic", unit: "mmHg", color: "#DC3545", icon: "fa-heart-pulse" },
    blood_pressure_diastolic: { label: "BP Diastolic", unit: "mmHg", color: "#FF8C00", icon: "fa-heart-pulse" },
    blood_sugar: { label: "Blood Sugar", unit: "mg/dL", color: "#9370DB", icon: "fa-droplet" },
    weight: { label: "Weight", unit: "kg", color: "#2E8B57", icon: "fa-weight-scale" },
    heart_rate: { label: "Heart Rate", unit: "bpm", color: "#E63946", icon: "fa-heart" },
    temperature: { label: "Temperature", unit: "°C", color: "#F4A261", icon: "fa-temperature-half" },
    oxygen_saturation: { label: "Oxygen", unit: "%", color: "#2A9D8F", icon: "fa-lungs" }
};

function loadTrendsPage() {
    renderMetricTabs();
    initRangePicker();
    loadMetricsChart();
}

function renderMetricTabs() {
    const wrap = $("metricTabs");
    if (!wrap) return;
    wrap.innerHTML = Object.entries(METRIC_CONFIG).map(([k, c]) => `
        <button class="metric-tab ${k === currentMetricType ? "active" : ""}" data-metric="${k}">
            <i class="fa-solid ${c.icon}"></i> ${c.label}
        </button>`).join("");
    wrap.querySelectorAll(".metric-tab").forEach(b => b.onclick = () => {
        currentMetricType = b.dataset.metric;
        renderMetricTabs();
        loadMetricsChart();
    });
}

function initRangePicker() {
    document.querySelectorAll(".range-btn").forEach(b => b.onclick = () => {
        document.querySelectorAll(".range-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        currentRangeDays = parseInt(b.dataset.days, 10);
        loadMetricsChart();
    });
}

async function loadMetricsChart() {
    if (!currentUser || currentUser.isAdmin) return;
    const cfg = METRIC_CONFIG[currentMetricType];
    if (!cfg) return;

    try {
        const params = new URLSearchParams({ type: currentMetricType });
        if (currentRangeDays > 0) params.append("days", currentRangeDays);
        const data = await api("/api/patient/metrics?" + params);
        const metrics = (data.metrics || []).sort((a, b) => new Date(a.measuredAt) - new Date(b.measuredAt));
        renderMetricsChart(metrics, cfg);
        renderMetricsStats(metrics, cfg);
        renderMetricsList(metrics, cfg);
    } catch (err) { toast(err.message, "error"); }
}

function renderMetricsChart(metrics, cfg) {
    const canvas = $("metricsChart"), empty = $("chartEmpty");
    if (!canvas || !empty) return;

    if (metricsChartInstance) { metricsChartInstance.destroy(); metricsChartInstance = null; }

    if (metrics.length === 0) {
        canvas.style.display = "none";
        empty.classList.remove("hidden");
        return;
    }
    canvas.style.display = "block";
    empty.classList.add("hidden");

    const labels = metrics.map(m => new Date(m.measuredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    const values = metrics.map(m => m.value);
    const isDark = document.body.classList.contains("dark-mode");
    const gridColor = isDark ? "#30403a" : "#e6ecea";
    const tickColor = isDark ? "#aabbb4" : "#687a74";

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 340);
    gradient.addColorStop(0, cfg.color + "55");
    gradient.addColorStop(1, cfg.color + "00");

    metricsChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: `${cfg.label} (${cfg.unit})`,
                data: values,
                borderColor: cfg.color,
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: "#fff",
                pointBorderColor: cfg.color,
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: tickColor } } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: tickColor } },
                y: { grid: { color: gridColor }, ticks: { color: tickColor } }
            }
        }
    });
}

function renderMetricsStats(metrics, cfg) {
    const wrap = $("chartStats");
    if (!wrap) return;
    if (metrics.length === 0) { wrap.innerHTML = ""; return; }
    const values = metrics.map(m => m.value);
    wrap.innerHTML = `
        <div class="chart-stat"><small>Latest</small><b>${values[values.length - 1]} ${cfg.unit}</b></div>
        <div class="chart-stat"><small>Average</small><b>${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)} ${cfg.unit}</b></div>
        <div class="chart-stat"><small>Min</small><b>${Math.min(...values)} ${cfg.unit}</b></div>
        <div class="chart-stat"><small>Max</small><b>${Math.max(...values)} ${cfg.unit}</b></div>`;
}

function renderMetricsList(metrics, cfg) {
    const wrap = $("metricsList");
    if (!wrap) return;
    if (metrics.length === 0) {
        wrap.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i><span>No readings yet.</span></div>`;
        return;
    }
    wrap.innerHTML = [...metrics].reverse().slice(0, 20).map(m => `
        <div class="metric-row">
            <span class="metric-row-date">${new Date(m.measuredAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span class="metric-row-value">${m.value} ${escapeHtml(cfg.unit)}</span>
            ${m.notes ? `<span class="metric-row-notes">${escapeHtml(m.notes)}</span>` : ""}
            <button class="table-btn remove" onclick="deleteMetric('${m.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>`).join("");
}

function openAddMetric() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const opts = Object.entries(METRIC_CONFIG).map(([k, c]) => `<option value="${k}" ${k === currentMetricType ? "selected" : ""}>${c.label} (${c.unit})</option>`).join("");
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>Add Reading</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="metricForm">
                <div class="form-grid">
                    <label>Type <select id="mType">${opts}</select></label>
                    <label>Value <input id="mValue" type="number" step="0.1" required></label>
                    <label>When <input id="mWhen" type="datetime-local" required></label>
                </div>
                <label>Notes <textarea id="mNotesM" rows="2"></textarea></label>
                <button class="btn btn-primary full mt-14" type="submit">Save</button>
            </form>
        </div>`;
    const now = new Date();
    overlay.querySelector("#mWhen").value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.body.appendChild(overlay);

    $("metricForm").onsubmit = async e => {
        e.preventDefault();
        try {
            await api("/api/patient/metrics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: $("mType").value,
                    value: parseFloat($("mValue").value),
                    measuredAt: $("mWhen").value,
                    notes: $("mNotesM").value.trim()
                })
            });
            toast("Reading added.");
            overlay.remove();
            loadMetricsChart();
        } catch (err) { toast(err.message, "error"); }
    };
}

async function deleteMetric(id) {
    if (!confirm("Delete this reading?")) return;
    try {
        await api(`/api/patient/metrics/${id}`, { method: "DELETE" });
        loadMetricsChart();
    } catch (err) { toast(err.message, "error"); }
}

// ------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------
async function loadSummaryPage() {
    // Fire all four requests in parallel; each can fail independently
    const [docsRes, presRes, pharmRes, labRes] = await Promise.allSettled([
        api("/api/patient/summary/doctors"),
        api("/api/patient/summary/prescriptions"),
        api("/api/patient/summary/pharmacy"),
        api("/api/patient/lab-results")
    ]);

    /* ---------- Visited Doctors ---------- */
    const dbody = $("summaryDoctorsBody");
    if (dbody) {
        if (docsRes.status !== "fulfilled") {
            dbody.innerHTML = `<tr><td colspan="5" class="table-empty-cell">Could not load doctors: ${escapeHtml(docsRes.reason?.message || "error")}</td></tr>`;
        } else {
            const doctors = docsRes.value.doctors || [];
            if (doctors.length === 0) {
                dbody.innerHTML = `<tr><td colspan="5" class="table-empty-cell">No visits yet.</td></tr>`;
            } else {
                dbody.innerHTML = doctors.map(d => `
                    <tr>
                        <td><b>${escapeHtml(d.doctorName)}</b></td>
                        <td>${escapeHtml(d.degree || "—")}</td>
                        <td>${escapeHtml(d.specialization || d.profession || "—")}</td>
                        <td>${escapeHtml(d.lastWorkedPlace || "—")}</td>
                        <td>${escapeHtml(d.visitDate || "—")}</td>
                    </tr>`).join("");
            }
        }
    }

    /* ---------- Prescriptions ---------- */
    const pbody = $("summaryPrescriptionsBody");
    if (pbody) {
        if (presRes.status !== "fulfilled") {
            pbody.innerHTML = `<tr><td colspan="6" class="table-empty-cell">Could not load prescriptions: ${escapeHtml(presRes.reason?.message || "error")}</td></tr>`;
        } else {
            const prescriptions = presRes.value.prescriptions || [];
            if (prescriptions.length === 0) {
                pbody.innerHTML = `<tr><td colspan="6" class="table-empty-cell">No prescriptions yet.</td></tr>`;
            } else {
                pbody.innerHTML = prescriptions.map(p => `
                    <tr>
                        <td><b>${escapeHtml(p.medicineName)}</b></td>
                        <td>${escapeHtml(p.doctorName)}</td>
                        <td>${escapeHtml(p.dosage || "—")}</td>
                        <td>${p.durationDays ? p.durationDays + " days" : "—"}</td>
                        <td>${new Date(p.prescribedAt).toLocaleDateString()}</td>
                        <td>${escapeHtml(p.notes || "—")}</td>
                    </tr>`).join("");
            }
        }
    }

    /* ---------- Pharmacy Dispense History ---------- */
    const phbody = $("summaryPharmacyBody");
    if (phbody) {
        if (pharmRes.status !== "fulfilled") {
            phbody.innerHTML = `<tr><td colspan="5" class="table-empty-cell">Could not load pharmacy history: ${escapeHtml(pharmRes.reason?.message || "error")}</td></tr>`;
        } else {
            const records = pharmRes.value.records || [];
            if (records.length === 0) {
                phbody.innerHTML = `<tr><td colspan="5" class="table-empty-cell">No pharmacy records yet.</td></tr>`;
            } else {
                phbody.innerHTML = records.map(r => `
                    <tr>
                        <td>${escapeHtml(r.pharmacyName || r.pharmacy_name || "—")}</td>
                        <td>${escapeHtml(r.medicineName || r.medicine_name || "—")}</td>
                        <td>${r.dispensedAt
                            ? String(r.dispensedAt).slice(0, 10)
                            : (r.created_at ? String(r.created_at).slice(0, 10) : "—")}</td>
                        <td>${r.status
                            ? `<span class="status ${escapeHtml(r.status)}">${escapeHtml(r.status)}</span>`
                            : "—"}</td>
                        <td>${escapeHtml(r.substitutionNote || r.substitution_note || r.reason || r.notes || "—")}</td>
                    </tr>`).join("");
            }
        }
    }

    /* ---------- Lab Test Results ---------- */
    const lbody = $("summaryLabBody");
    if (lbody) {
        if (labRes.status !== "fulfilled") {
            lbody.innerHTML = `<tr><td colspan="7" class="table-empty-cell">Could not load lab results: ${escapeHtml(labRes.reason?.message || "error")}</td></tr>`;
        } else {
            const results = labRes.value.results || [];
            if (results.length === 0) {
                lbody.innerHTML = `<tr><td colspan="7" class="table-empty-cell">No lab results yet.</td></tr>`;
            } else {
                lbody.innerHTML = results.map(r => `
                    <tr>
                        <td>${escapeHtml(r.lab_name || r.labName || "—")}</td>
                        <td><b>${escapeHtml(r.test_name || r.testName || "—")}</b></td>
                        <td>${r.test_date
                            ? String(r.test_date).slice(0, 10)
                            : (r.testDate ? String(r.testDate).slice(0, 10) : "—")}</td>
                        <td>${escapeHtml(r.result_value || r.resultValue || "—")} ${escapeHtml(r.unit || "")}</td>
                        <td>${escapeHtml(r.reference_range || r.referenceRange || "—")}</td>
                        <td><span class="status ${escapeHtml(r.status || "normal")}">${escapeHtml(r.status || "normal")}</span></td>
                        <td>${escapeHtml(r.notes || "—")}</td>
                    </tr>`).join("");
            }
        }
    }
}

// ------------------------------------------------------------
// MCARD
// ------------------------------------------------------------
async function loadMCardPage() {
    const panel = $("mcardPanel");
    if (!panel) return;
    panel.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const data = await api("/api/mcard");
        const m = data.mcard;
        panel.innerHTML = `
            <div class="card-details-grid">
                <div>
                    <h3 class="mb-14">Card details</h3>
                    <div class="metric-row"><span class="metric-row-date">MCard ID</span><span class="metric-row-value font-mono">${escapeHtml(m.mcardId)}</span></div>
                    <div class="metric-row"><span class="metric-row-date">Name</span><span>${escapeHtml(m.fullName)}</span></div>
                    <div class="metric-row"><span class="metric-row-date">Mobile</span><span>${escapeHtml(m.mobile)}</span></div>
                    <div class="metric-row"><span class="metric-row-date">Date of birth</span><span>${escapeHtml(m.dateOfBirth || "")}</span></div>
                    ${m.bloodGroup ? `<div class="metric-row"><span class="metric-row-date">Blood group</span><span><b>${escapeHtml(m.bloodGroup)}</b></span></div>` : ""}
                    <div class="metric-row"><span class="metric-row-date">Emergency</span><span>${escapeHtml(m.emergencyContactName || "—")} · ${escapeHtml(m.emergencyContactNumber || "")}</span></div>
                    <div class="metric-row"><span class="metric-row-date">Issued year</span><span>${m.issuedYear}</span></div>

                    <div class="mt-20">
                        <button class="btn btn-primary" onclick="downloadMCard()"><i class="fa-solid fa-download"></i> Download PDF</button>
                    </div>
                </div>
                <div class="qr-container">
                    <img src="/api/mcard/qr.svg?t=${Date.now()}" alt="QR code" class="qr-code-img">
                    <p class="qr-subtext">Scan for emergency info</p>
                </div>
            </div>`;
    } catch (err) {
        panel.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i><span>${escapeHtml(err.message)}</span></div>`;
    }
}

function downloadMCard() {
    const a = document.createElement("a");
    a.href = "/api/mcard/card.pdf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Preparing your MCard...");
}

// ------------------------------------------------------------
// CHAT
// ------------------------------------------------------------
function refreshChatFabVisibility() {
    const fab = $("chatFab");
    if (!fab) return;
    const visible = currentUser && !currentUser.isAdmin;
    fab.classList.toggle("hidden", !visible);
    if (!visible) {
        $("chatWindow")?.classList.add("hidden");
        chatOpen = false;
    }
}

function initChat() {
    const fab = $("chatFab"), win = $("chatWindow");
    if (!fab || !win || fab.dataset.bound === "1") return;
    fab.dataset.bound = "1";

    const suggestions = [
        "What medicines do I take today?",
        "When is my next appointment?",
        "How many reports do I have?",
        "What is my emergency contact?"
    ];

    $("chatSuggestions").innerHTML = suggestions.map(s =>
        `<button type="button" class="chat-chip" data-q="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join("");

    $("chatSuggestions").onclick = e => {
        const chip = e.target.closest(".chat-chip");
        if (chip) sendChatMessage(chip.dataset.q);
    };

    fab.onclick = () => {
        chatOpen = !chatOpen;
        win.classList.toggle("hidden", !chatOpen);
        if (chatOpen && chatHistory.length === 0) {
            pushChatMessage("assistant", `Hi ${(currentUser?.fullName || "").split(" ")[0] || "there"}! 👋 Ask me about your medicines, appointments or reports.`);
        }
        if (chatOpen) setTimeout(() => $("chatInput")?.focus(), 100);
    };
    $("chatClose").onclick = () => { chatOpen = false; win.classList.add("hidden"); };

    $("chatForm").onsubmit = e => {
        e.preventDefault();
        const t = $("chatInput").value.trim();
        if (!t) return;
        $("chatInput").value = "";
        sendChatMessage(t);
    };
}

function pushChatMessage(role, content) {
    const c = $("chatMessages");
    if (!c) return;
    chatHistory.push({ role, content });
    const el = document.createElement("div");
    el.className = `chat-msg ${role}`;
    el.innerHTML = role === "assistant"
        ? escapeHtml(content).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")
        : escapeHtml(content);
    c.appendChild(el);
    c.scrollTop = c.scrollHeight;
}

async function sendChatMessage(text) {
    pushChatMessage("user", text);

    const container = $("chatMessages");
    const typing = document.createElement("div");
    typing.className = "chat-msg assistant typing";
    typing.id = "chatTyping";
    typing.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;

    $("chatSend").disabled = true;
    $("chatInput").disabled = true;

    try {
        const data = await api("/api/patient/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, history: chatHistory.slice(-10) })
        });

        typing.remove();

        // Main reply
        pushChatMessage("assistant", data.reply || "No reply.");

        // Show a badge if this was offline
        if (data.source === "offline") {
            const badge = document.createElement("div");
            badge.className = "chat-msg assistant chat-offline-badge";

            const reasonText = {
                rate_limit: "daily limit reached",
                network: "network issue",
                auth: "AI not configured",
                blocked: "message blocked",
                unknown: "AI unavailable"
            }[data.reason] || "AI unavailable";

            badge.innerHTML = `
                <i class="fa-solid fa-wifi"></i>
                <span>Offline mode — ${reasonText}</span>
            `;
            container.appendChild(badge);
            container.scrollTop = container.scrollHeight;

            // Update the header status text temporarily
            const statusEl = $("chatStatusText");
            if (statusEl) {
                statusEl.textContent = "Offline mode";
                setTimeout(() => {
                    if (statusEl) statusEl.textContent = "Powered by Gemini";
                }, 8000);
            }
        } else if (data.source === "gemini") {
            const statusEl = $("chatStatusText");
            if (statusEl) statusEl.textContent = "Powered by Gemini";
        }

    } catch (err) {
        typing.remove();
        pushChatMessage("assistant", `Sorry, something went wrong: ${err.message}`);
    } finally {
        $("chatSend").disabled = false;
        $("chatInput").disabled = false;
        $("chatInput").focus();
    }
}

// ------------------------------------------------------------
// ADMIN
// ------------------------------------------------------------
async function loadAdminOverview() {
    const el = $("adminStats");
    if (!el) return;
    try {
        const data = await api("/api/admin/stats");
        const s = data.stats;
        el.innerHTML = `
            <div class="stat-card"><b>${s.users_total}</b><span>Patients</span></div>
            <div class="stat-card"><b>${s.users_pending}</b><span>Pending patients</span></div>
            <div class="stat-card"><b>${s.doctors_total}</b><span>Doctors</span></div>
            <div class="stat-card"><b>${s.doctors_pending}</b><span>Pending doctors</span></div>
            <div class="stat-card"><b>${s.pharmacies_total}</b><span>Pharmacies</span></div>
            <div class="stat-card"><b>${s.pharmacies_pending}</b><span>Pending pharmacies</span></div>
            <div class="stat-card"><b>${s.appointments_total}</b><span>Appointments</span></div>
            <div class="stat-card"><b>${s.reports_total}</b><span>Reports</span></div>
            <div class="stat-card"><b>${s.dispense_total}</b><span>Dispensed</span></div>`;
    } catch (err) { toast(err.message, "error"); }
}

async function loadAdminUsers() {
    const tbody = $("adminUsersBody");
    if (!tbody) return;
    try {
        const data = await api("/api/admin/users");
        const users = data.users || [];
        if ($("userCountBadge")) $("userCountBadge").textContent = users.length;

        const term = ($("adminSearchInput")?.value || "").trim().toLowerCase();
        const filtered = term ? users.filter(u =>
            [u.fullName, u.email, u.mobile, u.mcardId].filter(Boolean).some(v => String(v).toLowerCase().includes(term))
        ) : users;

        tbody.innerHTML = filtered.length === 0
            ? `<tr><td colspan="6" class="table-empty-cell-padded">No matches.</td></tr>`
            : filtered.map(u => `
                <tr>
                    <td><b>${escapeHtml(u.fullName)}</b></td>
                    <td>${escapeHtml(u.mobile)}</td>
                    <td class="text-mono-sm">${escapeHtml(u.mcardId || "—")}</td>
                    <td><span class="status ${u.status}">${u.status}</span></td>
                    <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="table-btn approve" onclick="adminUserAction('${u.id}','approve')" title="Approve"><i class="fa-solid fa-check"></i></button>
                        <button class="table-btn table-btn-reject" onclick="adminUserAction('${u.id}','reject')" title="Reject"><i class="fa-solid fa-ban"></i></button>
                        <button class="table-btn remove" onclick="adminUserAction('${u.id}','delete')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`).join("");
    } catch (err) { toast(err.message, "error"); }
}

async function adminUserAction(id, action) {
    if (action === "delete" && !confirm("Delete this patient and all their data?")) return;
    try {
        await api(`/api/admin/users/${id}/${action}`, { method: "POST" });
        toast(`User ${action}d.`);
        loadAdminUsers();
    } catch (err) { toast(err.message, "error"); }
}

async function loadAdminDoctors() {
    const tbody = $("adminDoctorsBody");
    if (!tbody) return;
    try {
        const data = await api("/api/admin/doctors");
        const docs = data.doctors || [];
        if ($("doctorCountBadge")) $("doctorCountBadge").textContent = docs.length;

        const term = ($("doctorSearchInputAdmin")?.value || "").trim().toLowerCase();
        const filtered = term ? docs.filter(d =>
            [d.fullName, d.email, d.profession, d.specialization].filter(Boolean).some(v => String(v).toLowerCase().includes(term))
        ) : docs;

        tbody.innerHTML = filtered.map(d => `
            <tr>
                <td><b>${escapeHtml(d.fullName)}</b></td>
                <td>${escapeHtml(d.specialization || d.profession || "—")}</td>
                <td>${escapeHtml(d.email)}</td>
                <td>${d.patientCount}</td>
                <td><span class="status ${d.status}">${d.status}</span></td>
                <td>
                    <button class="table-btn approve" onclick="adminDoctorAction('${d.id}','approve')" title="Approve"><i class="fa-solid fa-check"></i></button>
                    <button class="table-btn table-btn-reject" onclick="adminDoctorAction('${d.id}','reject')" title="Reject"><i class="fa-solid fa-ban"></i></button>
                    <button class="table-btn" onclick="adminDoctorAction('${d.id}','toggle')" title="Toggle"><i class="fa-solid fa-power-off"></i></button>
                    <button class="table-btn remove" onclick="adminDoctorAction('${d.id}','delete')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join("");
    } catch (err) { toast(err.message, "error"); }
}

async function adminDoctorAction(id, action) {
    if (action === "delete" && !confirm("Delete this doctor?")) return;
    try {
        await api(`/api/admin/doctors/${id}/${action}`, { method: "POST" });
        toast(`Done.`);
        loadAdminDoctors();
    } catch (err) { toast(err.message, "error"); }
}

async function loadAdminPharmacies() {
    const tbody = $("adminPharmaciesBody");
    if (!tbody) return;
    try {
        const data = await api("/api/admin/pharmacies");
        const ph = data.pharmacies || [];
        if ($("pharmacyCountBadge")) $("pharmacyCountBadge").textContent = ph.length;

        tbody.innerHTML = ph.map(p => `
            <tr>
                <td><b>${escapeHtml(p.pharmacyName)}</b></td>
                <td>${escapeHtml(p.email)}</td>
                <td>${escapeHtml(p.phone || "—")}</td>
                <td>${p.medicineCount}</td>
                <td><span class="status ${p.status}">${p.status}</span></td>
                <td>
                    <button class="table-btn approve" onclick="adminPharmacyAction('${p.id}','approve')" title="Approve"><i class="fa-solid fa-check"></i></button>
                    <button class="table-btn table-btn-reject" onclick="adminPharmacyAction('${p.id}','reject')" title="Reject"><i class="fa-solid fa-ban"></i></button>
                    <button class="table-btn" onclick="adminPharmacyAction('${p.id}','toggle')" title="Toggle"><i class="fa-solid fa-power-off"></i></button>
                    <button class="table-btn remove" onclick="adminPharmacyAction('${p.id}','delete')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join("");
    } catch (err) { toast(err.message, "error"); }
}

async function adminPharmacyAction(id, action) {
    if (action === "delete" && !confirm("Delete this pharmacy?")) return;
    try {
        await api(`/api/admin/pharmacies/${id}/${action}`, { method: "POST" });
        toast("Done.");
        loadAdminPharmacies();
    } catch (err) { toast(err.message, "error"); }
}

document.addEventListener("DOMContentLoaded", () => {
    $("adminSearchInput")?.addEventListener("input", debounce(loadAdminUsers, 250));
    $("doctorSearchInputAdmin")?.addEventListener("input", debounce(loadAdminDoctors, 250));
});

// ------------------------------------------------------------
// BOOT
// ------------------------------------------------------------
async function boot() {
    loadTheme();
    loadFontSize();
    initAuthForms();
    initChat();

    try {
        const data = await api("/api/me");

        if (!data.loggedIn || !data.user) {
            currentUser = null;
            rebuildSidebar();
            showPage("home");
            refreshChatFabVisibility();
            return;
        }

        // If logged in as doctor/pharmacy, redirect to correct portal
        if (data.role === "doctor") {
            window.location.href = "/doctor";
            return;
        }
        if (data.role === "pharmacy") {
            window.location.href = "/pharmacy";
            return;
        }

        currentUser = { ...data.user, isAdmin: data.role === "admin" };
        rebuildSidebar();
    } catch (err) {
        console.error("Boot error:", err);
        currentUser = null;
        rebuildSidebar();
        showPage("home");
        refreshChatFabVisibility();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
} else {
    boot();
}
// ============================================================
// VOICE ASSISTANT — Speech Recognition (input) + Speech Synthesis (output)
// ============================================================

// ---- Browser support detection ----
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSupported = !!SpeechRecognitionAPI;
const ttsSupported = "speechSynthesis" in window;

let recognition = null;
let isListening = false;
let finalTranscript = "";
let interimTranscript = "";

let voiceOutputEnabled = localStorage.getItem("medhelper-voice-output") === "1";
let availableVoices = [];

// ---- Load voices (they load async in most browsers) ----
function loadVoices() {
    if (!ttsSupported) return;
    availableVoices = window.speechSynthesis.getVoices();
}

if (ttsSupported) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

// ---- Pick the best matching voice for the user's language ----
function pickBestVoice() {
    if (availableVoices.length === 0) loadVoices();

    const lang = (navigator.language || "en-US").toLowerCase();

    // 1. Exact locale match
    let v = availableVoices.find(x => x.lang.toLowerCase() === lang);
    if (v) return v;

    // 2. Same base language
    const base = lang.split("-")[0];
    v = availableVoices.find(x => x.lang.toLowerCase().startsWith(base));
    if (v) return v;

    // 3. Any English voice
    v = availableVoices.find(x => x.lang.toLowerCase().startsWith("en"));
    return v || availableVoices[0] || null;
}

// ---- Strip markdown + emojis before speaking ----
function cleanTextForSpeech(text) {
    return String(text)
        // Remove emojis
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
        // Bold **text**
        .replace(/\*\*(.+?)\*\*/g, "$1")
        // Italic *text*
        .replace(/\*(.+?)\*/g, "$1")
        // Code `text`
        .replace(/`(.+?)`/g, "$1")
        // Bullets → pause
        .replace(/^[•\-]\s*/gm, "")
        // Newlines → period
        .replace(/\n+/g, ". ")
        // Collapse periods
        .replace(/\.\s*\./g, ".")
        .replace(/\s{2,}/g, " ")
        .trim();
}

// ---- Speak a reply ----
function speakText(text) {
    if (!voiceOutputEnabled || !ttsSupported) return;
    if (!text || !String(text).trim()) return;

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(clean);
    const voice = pickBestVoice();
    if (voice) utter.voice = voice;

    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    utter.lang = navigator.language || "en-US";

    window.speechSynthesis.speak(utter);
}

// ---- Update the mic button visual state ----
function setMicButtonState(listening) {
    const btn = $("chatMic");
    if (!btn) return;

    isListening = listening;
    btn.classList.toggle("listening", listening);

    const icon = btn.querySelector("i");
    if (icon) {
        icon.className = listening
            ? "fa-solid fa-stop"
            : "fa-solid fa-microphone";
    }

    btn.title = listening ? "Tap to stop" : "Tap to speak";

    // Listening hint bubble
    let hint = document.getElementById("chatListeningHint");
    if (listening) {
        if (!hint) {
            hint = document.createElement("div");
            hint.id = "chatListeningHint";
            hint.className = "chat-listening-hint";
            hint.innerHTML = `
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                <span>Listening... speak now</span>
            `;
            const inputRow = document.querySelector(".chat-input-row");
            if (inputRow && inputRow.parentNode) {
                inputRow.parentNode.insertBefore(hint, inputRow);
            }
        }
    } else if (hint) {
        hint.remove();
    }
}

// ---- Update the speaker icon ----
function setSpeakerIcon() {
    const btn = $("chatSpeakerToggle");
    if (!btn) return;

    btn.classList.toggle("active", voiceOutputEnabled);
    btn.title = voiceOutputEnabled
        ? "Voice replies: on"
        : "Voice replies: off";

    const icon = btn.querySelector("i");
    if (icon) {
        icon.className = voiceOutputEnabled
            ? "fa-solid fa-volume-high"
            : "fa-solid fa-volume-xmark";
    }
}

// ---- Start listening ----
function startListening() {
    if (!speechSupported) {
        toast("Voice input is not supported in this browser.", "error");
        return;
    }

    if (isListening) {
        stopListening();
        return;
    }

    // Stop any ongoing TTS so the mic doesn't pick it up
    if (ttsSupported) window.speechSynthesis.cancel();

    finalTranscript = "";
    interimTranscript = "";

    try {
        recognition = new SpeechRecognitionAPI();
    } catch (e) {
        toast("Could not initialize voice input.", "error");
        return;
    }

    recognition.lang = navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Remove any previous interim bubble
    document.querySelectorAll(".chat-msg.user.interim").forEach(el => el.remove());

    let interimEl = null;

    recognition.onstart = () => {
        setMicButtonState(true);
    };

    recognition.onresult = (event) => {
        interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const text = res[0].transcript;
            if (res.isFinal) finalTranscript += text;
            else interimTranscript += text;
        }

        // Live interim bubble
        const container = $("chatMessages");
        if (!container) return;

        if (!interimEl) {
            interimEl = document.createElement("div");
            interimEl.className = "chat-msg user interim";
            container.appendChild(interimEl);
        }
        interimEl.textContent = (finalTranscript + " " + interimTranscript).trim();
        container.scrollTop = container.scrollHeight;
    };

    recognition.onerror = (event) => {
        if (event.error === "no-speech" || event.error === "aborted") return;

        console.warn("Speech recognition error:", event.error);

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            toast("Microphone permission denied.", "error");
        } else if (event.error === "network") {
            toast("Speech service unreachable. Check your connection.", "error");
        } else {
            toast("Voice input error: " + event.error, "error");
        }
    };

    recognition.onend = () => {
        setMicButtonState(false);

        // Remove interim bubble
        document.querySelectorAll(".chat-msg.user.interim").forEach(el => el.remove());

        const text = (finalTranscript || interimTranscript).trim();
        if (text) sendChatMessage(text);
    };

    try {
        recognition.start();
    } catch (e) {
        console.error("Could not start recognition:", e);
        toast("Could not start voice input.", "error");
        setMicButtonState(false);
    }
}

// ---- Stop listening ----
function stopListening() {
    if (recognition) {
        try { recognition.stop(); } catch (e) { /* ignore */ }
    }
    setMicButtonState(false);
}

// ---- Wire up the buttons ----
function initVoiceAssistant() {
    const micBtn = $("chatMic");
    const speakerBtn = $("chatSpeakerToggle");

    if (!micBtn || !speakerBtn) {
        requestAnimationFrame(initVoiceAssistant);
        return;
    }

    // Avoid double-binding
    if (micBtn.dataset.bound === "1") return;
    micBtn.dataset.bound = "1";
    speakerBtn.dataset.bound = "1";

    // Hide mic if not supported
    if (!speechSupported) {
        micBtn.classList.add("hidden");
        micBtn.title = "Voice input not supported";
    } else {
        micBtn.addEventListener("click", startListening);
    }

    // Speaker toggle
    setSpeakerIcon();

    speakerBtn.addEventListener("click", () => {
        voiceOutputEnabled = !voiceOutputEnabled;
        localStorage.setItem("medhelper-voice-output", voiceOutputEnabled ? "1" : "0");
        setSpeakerIcon();

        if (voiceOutputEnabled) {
            toast("Voice replies enabled.");

            // Warm up the speech engine (needed on some browsers)
            try {
                const warmup = new SpeechSynthesisUtterance(" ");
                warmup.volume = 0;
                window.speechSynthesis.speak(warmup);
            } catch (e) { /* ignore */ }
        } else {
            if (ttsSupported) window.speechSynthesis.cancel();
            toast("Voice replies disabled.");
        }
    });
}

// ---- Watch for new assistant messages and speak them ----
function observeAssistantMessages() {
    const container = $("chatMessages");
    if (!container) {
        requestAnimationFrame(observeAssistantMessages);
        return;
    }
    if (container.dataset.voiceObserved === "1") return;
    container.dataset.voiceObserved = "1";

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (!node.classList.contains("chat-msg")) continue;
                if (!node.classList.contains("assistant")) continue;
                if (node.classList.contains("typing")) continue;
                if (node.classList.contains("interim")) continue;
                if (node.classList.contains("chat-offline-badge")) continue;

                const text = node.textContent || "";
                if (text.trim()) speakText(text);
            }
        }
    });

    observer.observe(container, { childList: true });
}

// ---- Auto-init ----
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initVoiceAssistant();
        observeAssistantMessages();
    });
} else {
    initVoiceAssistant();
    observeAssistantMessages();
}

// ---- Expose globally ----
window.startVoiceListening = startListening;
window.stopVoiceListening = stopListening;
window.toggleVoiceOutput = () => {
    voiceOutputEnabled = !voiceOutputEnabled;
    localStorage.setItem("medhelper-voice-output", voiceOutputEnabled ? "1" : "0");
    setSpeakerIcon();
};
// ------------------------------------------------------------
// GLOBAL EXPORTS (for inline onclick)
// ------------------------------------------------------------
window.showPage = showPage;
window.logout = logout;
window.toggleDarkMode = toggleDarkMode;
window.changeFontSize = changeFontSize;
window.resetFontSize = resetFontSize;
window.printReport = printReport;
window.deleteReport = deleteReport;
window.openAddAppointment = openAddAppointment;
window.deleteAppointment = deleteAppointment;
window.openDoctorRequest = openDoctorRequest;
window.openAddMedicine = openAddMedicine;
window.deleteMedicine = deleteMedicine;
window.toggleMedicineSlot = toggleMedicineSlot;
window.openAddMetric = openAddMetric;
window.deleteMetric = deleteMetric;
window.downloadMCard = downloadMCard;
window.adminUserAction = adminUserAction;
window.adminDoctorAction = adminDoctorAction;
window.adminPharmacyAction = adminPharmacyAction;
window.loadAdminUsers = loadAdminUsers;
window.loadAdminDoctors = loadAdminDoctors;
window.loadAdminPharmacies = loadAdminPharmacies;
window.loadEditProfile = loadEditProfile;


document.addEventListener("languageChanged", () => {
    const active = document.querySelector(".page.active-page");
    if (!active) return;
    const id = active.id.replace("Page", "");
    if (typeof showPage === "function") showPage(id);
});