// ============================================================
// MCARD-PHR DOCTOR PORTAL SPA
// ============================================================

let currentDoctor = null;
let requestsCache = [];

const $ = id => document.getElementById(id);
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

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
    if (!currentDoctor && !["doctorLogin", "doctorRegister"].includes(name)) name = "doctorLogin";
    if (currentDoctor && ["doctorLogin", "doctorRegister"].includes(name)) name = "doctorDashboard";

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
    const p = document.getElementById(name + "Page");
    if (p) p.classList.add("active-page");

    document.querySelectorAll(".sidebar-link[data-page]").forEach(b =>
        b.classList.toggle("active", b.dataset.page === name));

    if (name === "doctorDashboard") loadDoctorDashboard();
    if (name === "doctorRequests") loadDoctorRequests();
    if (name === "doctorPatients") loadDoctorPatients();
    if (name === "doctorSchedule") loadDoctorSchedule();
    if (name === "doctorProfile") loadDoctorProfile();
}

function rebuildSidebar() {
    if (!currentDoctor) {
        const el = $("sidebar");
        if (!el) return;
        el.innerHTML = `
            <div class="sidebar-brand">
                <span class="brand-logo"><i class="fa-solid fa-heart-pulse"></i></span>
                <div class="sidebar-brand-text">
                    <strong>MCARD-PHR Doctor</strong>
                    <small>Practice Portal</small>
                </div>
            </div>
            <nav class="sidebar-nav">
                <button class="sidebar-link" data-page="doctorLogin" type="button">
                    <i class="fa-solid fa-right-to-bracket"></i><span>Login</span>
                </button>
                <button class="sidebar-link" data-page="doctorRegister" type="button">
                    <i class="fa-solid fa-user-plus"></i><span>Register</span>
                </button>
            </nav>
            <div class="sidebar-footer">
                <button class="sidebar-link" data-action="toggle-theme" type="button">
                    <i class="fa-solid fa-moon"></i><span>Dark mode</span>
                </button>
            </div>`;
        el.querySelectorAll(".sidebar-link[data-page]").forEach(b => b.onclick = () => showPage(b.dataset.page));
        el.querySelector('[data-action="toggle-theme"]')?.addEventListener("click", toggleDarkMode);
        return;
    }
    renderSidebar({
        role: "doctor",
        portalTitle: "MCARD-PHR Doctor",
        portalSubtitle: currentDoctor.profession || "Practice Portal",
        user: currentDoctor
    });
    refreshRequestBadge();
}

// ------------------------------------------------------------
// THEME + FONT
// ------------------------------------------------------------
function toggleDarkMode() {
    const isDark = document.body.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", !isDark);
    localStorage.setItem("mcardphr-theme", !isDark ? "dark" : "light");
}
function loadTheme() {
    if (localStorage.getItem("mcardphr-theme") === "dark") document.body.classList.add("dark-mode");
}
const FONT_SIZES = [0.9, 1.0, 1.1, 1.2, 1.3];
let fontSizeIndex = 1;
function applyFontSize() {
    document.documentElement.style.fontSize = `${FONT_SIZES[fontSizeIndex]}rem`;
    localStorage.setItem("mcardphr-font-size", fontSizeIndex);
}
function changeFontSize(d) { fontSizeIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, fontSizeIndex + d)); applyFontSize(); }
function resetFontSize() { fontSizeIndex = 1; applyFontSize(); }
function loadFontSize() {
    const s = localStorage.getItem("mcardphr-font-size");
    if (s !== null) { const i = parseInt(s, 10); if (!isNaN(i) && i >= 0 && i < FONT_SIZES.length) fontSizeIndex = i; }
    applyFontSize();
}

// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------
function initAuth() {
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
            currentDoctor = data.user;
            rebuildSidebar();
            showPage("doctorDashboard");
            toast("Welcome, Dr. " + currentDoctor.fullName);
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
}

async function logout() {
    try { await api("/api/logout", { method: "POST" }); } catch {}
    window.location.href = "/";
}

// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------
async function loadDoctorDashboard() {
    if (!currentDoctor) return;
    if ($("doctorWelcome")) $("doctorWelcome").textContent = `Welcome, Dr. ${currentDoctor.fullName}`;
    try {
        const data = await api("/api/doctor/stats");
        const s = data.stats;
        if ($("doctorStats")) {
            $("doctorStats").innerHTML = `
                <div class="stat-card"><b>${s.pending}</b><span>Pending requests</span></div>
                <div class="stat-card"><b>${s.confirmed}</b><span>Confirmed</span></div>
                <div class="stat-card"><b>${s.completed}</b><span>Completed</span></div>
                <div class="stat-card"><b>${s.patients}</b><span>Unique patients</span></div>`;
        }
        setSidebarBadge("requestBadge", s.unread || s.pending);
    } catch (err) { toast(err.message, "error"); }
}

async function refreshRequestBadge() {
    try {
        const data = await api("/api/doctor/stats");
        setSidebarBadge("requestBadge", data.stats.pending || 0);
    } catch {}
}

// ------------------------------------------------------------
// REQUESTS
// ------------------------------------------------------------
async function loadDoctorRequests() {
    const wrap = $("doctorRequestsList");
    if (!wrap) return;
    wrap.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const data = await api("/api/doctor/requests");
        requestsCache = data.requests || [];

        if (requestsCache.length === 0) {
            wrap.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i>
                <span>No pending appointment requests.</span></div>`;
            return;
        }

        wrap.innerHTML = requestsCache.map(r => `
            <div class="request-card">
                <div class="request-info">
                    <h4>${escapeHtml(r.patientName)}</h4>
                    <p><i class="fa-solid fa-phone"></i> ${escapeHtml(r.patientMobile || "—")}</p>
                    <p><i class="fa-solid fa-envelope"></i> ${escapeHtml(r.patientEmail || "—")}</p>
                    <p><i class="fa-solid fa-calendar"></i> Requested: ${escapeHtml(r.requestedDate)} ${r.requestedTime ? "· " + escapeHtml(r.requestedTime) : ""}</p>
                    ${r.allergies ? `<p><i class="fa-solid fa-triangle-exclamation warning-icon"></i> Allergies: ${escapeHtml(r.allergies)}</p>` : ""}
                    ${r.diseases ? `<p><i class="fa-solid fa-notes-medical"></i> Diseases: ${escapeHtml(r.diseases)}</p>` : ""}
                    ${r.reason ? `<div class="request-reason">"${escapeHtml(r.reason)}"</div>` : ""}
                </div>
                <div class="request-actions">
                    <button class="btn btn-primary" onclick="openAcceptRequest('${r.id}')"><i class="fa-solid fa-check"></i> Accept</button>
                    <button class="btn btn-danger-outline" onclick="openRejectRequest('${r.id}')"><i class="fa-solid fa-xmark"></i> Reject</button>
                </div>
            </div>`).join("");
    } catch (err) { toast(err.message, "error"); }
}

function openAcceptRequest(id) {
    const r = requestsCache.find(x => x.id === id);
    if (!r) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>Accept — ${escapeHtml(r.patientName)}</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="acceptForm">
                <div class="form-grid">
                    <label>Confirm date <input id="acDate" type="date" value="${escapeHtml(r.requestedDate)}" required></label>
                    <label>Confirm time <input id="acTime" type="time" value="${escapeHtml(r.requestedTime || "")}"></label>
                </div>
                <label>Message to patient (optional)
                    <textarea id="acFeedback" rows="3" placeholder="e.g. Please bring recent test reports"></textarea>
                </label>
                <button class="btn btn-primary full mt-14" type="submit">
                    <i class="fa-solid fa-check"></i> Confirm Appointment
                </button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    $("acceptForm").onsubmit = async e => {
        e.preventDefault();
        try {
            await api(`/api/doctor/requests/${id}/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: $("acDate").value,
                    time: $("acTime").value,
                    feedback: $("acFeedback").value.trim()
                })
            });
            toast("Appointment confirmed.");
            overlay.remove();
            loadDoctorRequests();
            refreshRequestBadge();
        } catch (err) { toast(err.message, "error"); }
    };
}

function openRejectRequest(id) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>Reject Request</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="rejectForm">
                <label>Reason (optional)
                    <textarea id="rjFeedback" rows="3" placeholder="e.g. Not available at this time"></textarea>
                </label>
                <button class="btn btn-danger full mt-14" type="submit">
                    <i class="fa-solid fa-xmark"></i> Reject
                </button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    $("rejectForm").onsubmit = async e => {
        e.preventDefault();
        try {
            await api(`/api/doctor/requests/${id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ feedback: $("rjFeedback").value.trim() })
            });
            toast("Request rejected.");
            overlay.remove();
            loadDoctorRequests();
            refreshRequestBadge();
        } catch (err) { toast(err.message, "error"); }
    };
}

// ------------------------------------------------------------
// PATIENTS
// ------------------------------------------------------------
async function loadDoctorPatients() {
    const wrap = $("doctorPatientsList");
    if (!wrap) return;
    wrap.innerHTML = `<div class="loading-box full-col">
        <i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const data = await api("/api/doctor/patients");
        patients = data.patients || [];
        const term = ($("patientSearchInput")?.value || "").trim().toLowerCase();
        const filtered = term ? patients.filter(p =>
            [p.fullName, p.email, p.mobile].filter(Boolean).some(v => String(v).toLowerCase().includes(term))
        ) : patients;

        if (filtered.length === 0) {
            wrap.innerHTML = `<div class="notice col-span-full"><i class="fa-solid fa-circle-info"></i>
                <span>No patients yet.</span></div>`;
            return;
        }

        wrap.innerHTML = filtered.map(p => `
            <div class="doctor-card">
                ${p.profilePicture
                    ? `<img src="${escapeHtml(p.profilePicture)}" alt="">`
                    : `<div class="doctor-initial">${escapeHtml(p.fullName[0])}</div>`}
                <h3>${escapeHtml(p.fullName)}</h3>
                <p class="text-muted-sm">${escapeHtml(p.mobile)}</p>
                <p class="text-muted-xs">Last visit: ${escapeHtml(p.lastVisit || "—")}</p>
                <button class="btn btn-primary full mt-12" onclick="openPatientDetail('${p.id}')">
                    <i class="fa-solid fa-eye"></i> View
                </button>
            </div>`).join("");
    } catch (err) { toast(err.message, "error"); }
}

async function openPatientDetail(id) {
    try {
        const data = await api(`/api/doctor/patients/${id}`);
        const p = data.patient;
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal-card modal-card-wide">
                <div class="panel-heading">
                    <h3>${escapeHtml(p.fullName)}</h3>
                    <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
                <div class="form-grid">
                    <div><b>Mobile:</b> ${escapeHtml(p.mobile)}</div>
                    <div><b>Email:</b> ${escapeHtml(p.email)}</div>
                    <div><b>DOB:</b> ${escapeHtml(p.dateOfBirth || "—")}</div>
                    <div><b>Blood:</b> ${escapeHtml(p.bloodGroup || "—")}</div>
                    <div class="col-span-full"><b>Allergies:</b> ${escapeHtml(p.allergies || "None")}</div>
                    <div class="col-span-full"><b>Diseases:</b> ${escapeHtml(p.diseases || "None")}</div>
                    <div class="col-span-full"><b>Emergency:</b> ${escapeHtml(p.emergencyContactName || "—")} · ${escapeHtml(p.emergencyContactNumber || "")}</div>
                </div>

                <h4 class="mt-20">Visit history</h4>
                <div class="table-wrap mt-10">
                    <table><thead><tr><th>Date</th><th>Status</th><th>Reason</th></tr></thead>
                    <tbody>${data.history.map(h => `
                        <tr><td>${escapeHtml(h.date)} ${h.time ? "· " + escapeHtml(h.time) : ""}</td>
                        <td><span class="status ${h.status}">${h.status}</span></td>
                        <td>${escapeHtml(h.reason || "—")}</td></tr>`).join("") ||
                        `<tr><td colspan="3" class="table-empty-cell">No visits.</td></tr>`}
                    </tbody></table>
                </div>

                <h4 class="mt-20">Prescriptions</h4>
                <div class="table-wrap mt-10">
                    <table><thead><tr><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead>
                    <tbody>${data.prescriptions.map(pr => `
                        <tr><td>${escapeHtml(pr.medicineName)}</td>
                        <td>${escapeHtml(pr.dosage || "—")}</td>
                        <td>${pr.durationDays ? pr.durationDays + " days" : "—"}</td></tr>`).join("") ||
                        `<tr><td colspan="3" class="table-empty-cell">No prescriptions.</td></tr>`}
                    </tbody></table>
                </div>

                <button class="btn btn-primary mt-20" onclick="openWritePrescription('${p.id}', '${escapeHtml(p.fullName)}')">
                    <i class="fa-solid fa-prescription"></i> Write Prescription
                </button>
            </div>`;
        document.body.appendChild(overlay);
    } catch (err) { toast(err.message, "error"); }
}

function openWritePrescription(patientId, patientName) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>Prescribe to ${escapeHtml(patientName)}</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="rxForm">
                <label>Medicine name <input id="rxName" required></label>
                <div class="form-grid">
                    <label>Dosage <input id="rxDosage" placeholder="e.g. 1-0-1"></label>
                    <label>Duration (days) <input id="rxDays" type="number" min="1"></label>
                </div>
                <label>Notes <textarea id="rxNotes" rows="2"></textarea></label>
                <button class="btn btn-primary full mt-14" type="submit">
                    <i class="fa-solid fa-floppy-disk"></i> Save Prescription
                </button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    $("rxForm").onsubmit = async e => {
        e.preventDefault();
        try {
            await api(`/api/doctor/patients/${patientId}/prescriptions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    medicineName: $("rxName").value.trim(),
                    dosage: $("rxDosage").value.trim(),
                    durationDays: parseInt($("rxDays").value) || null,
                    notes: $("rxNotes").value.trim()
                })
            });
            toast("Prescription saved.");
            overlay.remove();
        } catch (err) { toast(err.message, "error"); }
    };
}

document.addEventListener("DOMContentLoaded", () => {
    $("patientSearchInput")?.addEventListener("input", debounce(loadDoctorPatients, 250));
});

function debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ------------------------------------------------------------
// SCHEDULE
// ------------------------------------------------------------
async function loadDoctorSchedule() {
    const wrap = $("doctorScheduleList");
    if (!wrap) return;
    wrap.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
    try {
        const data = await api("/api/doctor/schedule");
        const items = data.schedule || [];
        if (items.length === 0) {
            wrap.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i>
                <span>No confirmed appointments yet.</span></div>`;
            return;
        }
        wrap.innerHTML = `<div class="appointment-list">${items.map(a => `
            <div class="appointment-card">
                <div class="appointment-info">
                    <h4>${escapeHtml(a.patientName)} <span class="status ${a.status} status-pill-sub">${a.status}</span></h4>
                    <p><i class="fa-solid fa-calendar"></i> ${escapeHtml(a.date)} ${a.time ? "· " + escapeHtml(a.time) : ""}</p>
                    <p><i class="fa-solid fa-phone"></i> ${escapeHtml(a.patientMobile || "—")}</p>
                    ${a.reason ? `<p><i class="fa-solid fa-comment"></i> Reason: ${escapeHtml(a.reason)}</p>` : ""}
                </div>
            </div>`).join("")}</div>`;
    } catch (err) { toast(err.message, "error"); }
}

// ------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------
async function loadDoctorProfile() {
    const panel = $("doctorProfilePanel");
    if (!panel) return;
    try {
        const data = await api("/api/doctor/profile");
        const d = data.doctor;
        panel.innerHTML = `
            <form id="doctorProfileForm">
                <div class="form-grid">
                    <label>Full name <input id="dpName" value="${escapeHtml(d.fullName)}"></label>
                    <label>Email <input value="${escapeHtml(d.email)}" disabled></label>
                    <label>Degree <input id="dpDegree" value="${escapeHtml(d.degree || "")}"></label>
                    <label>Profession <input id="dpProfession" value="${escapeHtml(d.profession || "")}"></label>
                    <label>Specialization <input id="dpSpec" value="${escapeHtml(d.specialization || "")}"></label>
                    <label>Last worked place <input id="dpLastWorked" value="${escapeHtml(d.lastWorkedPlace || "")}"></label>
                    <label>Experience (years) <input id="dpExp" type="number" value="${d.experienceYears || ""}"></label>
                    <label>License number <input id="dpLicense" value="${escapeHtml(d.licenseNumber || "")}"></label>
                    <label>Consultation fee <input id="dpFee" type="number" step="0.01" value="${d.consultationFee ?? ""}"></label>
                    <label>Profile picture <input id="dpPic" type="file" accept="image/*"></label>
                    <label class="col-span-full">Bio <textarea id="dpBio" rows="3">${escapeHtml(d.bio || "")}</textarea></label>
                </div>
                <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button>
            </form>`;

        $("doctorProfileForm").onsubmit = async e => {
            e.preventDefault();
            const fd = new FormData();
            fd.append("fullName", $("dpName").value.trim());
            fd.append("degree", $("dpDegree").value.trim());
            fd.append("profession", $("dpProfession").value.trim());
            fd.append("specialization", $("dpSpec").value.trim());
            fd.append("lastWorkedPlace", $("dpLastWorked").value.trim());
            fd.append("experienceYears", $("dpExp").value);
            fd.append("licenseNumber", $("dpLicense").value.trim());
            fd.append("consultationFee", $("dpFee").value);
            fd.append("bio", $("dpBio").value.trim());
            if ($("dpPic")?.files[0]) fd.append("profilePicture", $("dpPic").files[0]);

            try {
                await api("/api/doctor/profile", { method: "PUT", body: fd });
                toast("Profile updated.");
                loadDoctorProfile();
            } catch (err) { toast(err.message, "error"); }
        };
    } catch (err) {
        panel.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i><span>${escapeHtml(err.message)}</span></div>`;
    }
}

// ------------------------------------------------------------
// BOOT
// ------------------------------------------------------------
async function boot() {
    loadTheme();
    loadFontSize();
    initAuth();

    try {
        const data = await api("/api/me");

        if (data.loggedIn && data.role === "doctor" && data.user) {
            currentDoctor = data.user;
            rebuildSidebar();
            showPage("doctorDashboard");
        } else if (data.loggedIn && data.role && data.role !== "doctor") {
            if (data.role === "pharmacy") { window.location.href = "/pharmacy"; return; }
            if (data.role === "patient") { window.location.href = "/"; return; }
            if (data.role === "admin") { window.location.href = "/"; return; }
            rebuildSidebar();
            showPage("doctorLogin");
        } else {
            rebuildSidebar();
            showPage("doctorLogin");
        }
    } catch (err) {
        console.error("Boot error:", err);
        rebuildSidebar();
        showPage("doctorLogin");
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
} else {
    boot();
}

window.showPage = showPage;
window.logout = logout;
window.toggleDarkMode = toggleDarkMode;
window.changeFontSize = changeFontSize;
window.resetFontSize = resetFontSize;
window.openAcceptRequest = openAcceptRequest;
window.openRejectRequest = openRejectRequest;
window.openPatientDetail = openPatientDetail;
window.openWritePrescription = openWritePrescription;
window.loadDoctorRequests = loadDoctorRequests;