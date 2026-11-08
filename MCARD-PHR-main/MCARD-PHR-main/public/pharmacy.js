// ============================================================
// MCARD-PHR PHARMACY PORTAL SPA
// ============================================================

let currentPharmacy = null;
let inventoryCache = [];
let currentCategory = "all";
let currentPatient = null;

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
    if (!currentPharmacy && !["pharmacyLogin", "pharmacyRegister"].includes(name)) name = "pharmacyLogin";
    if (currentPharmacy && ["pharmacyLogin", "pharmacyRegister"].includes(name)) name = "pharmacyDashboard";

    document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
    const p = document.getElementById(name + "Page");
    if (p) p.classList.add("active-page");

    document.querySelectorAll(".sidebar-link[data-page]").forEach(b =>
        b.classList.toggle("active", b.dataset.page === name));

    if (name === "pharmacyDashboard") loadPharmacyDashboard();
    if (name === "pharmacySearch") loadPharmacySearch();
    if (name === "pharmacyInventory") loadInventory();
    if (name === "pharmacyHistory") loadDispenseHistory();
    if (name === "pharmacyProfile") loadPharmacyProfile();
}

function rebuildSidebar() {
    if (!currentPharmacy) {
        const el = $("sidebar");
        if (!el) return;
        el.innerHTML = `
            <div class="sidebar-brand">
                <span class="brand-logo"><i class="fa-solid fa-prescription-bottle-medical"></i></span>
                <div class="sidebar-brand-text">
                    <strong>MCARD-PHR Pharmacy</strong>
                    <small>Dispense Portal</small>
                </div>
            </div>
            <nav class="sidebar-nav">
                <button class="sidebar-link" data-page="pharmacyLogin" type="button">
                    <i class="fa-solid fa-right-to-bracket"></i><span>Login</span>
                </button>
                <button class="sidebar-link" data-page="pharmacyRegister" type="button">
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
        role: "pharmacy",
        portalTitle: "MCARD-PHR Pharmacy",
        portalSubtitle: currentPharmacy.fullName,
        user: currentPharmacy
    });
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
    $("pharmacyLoginForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        try {
            const data = await api("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: $("phLoginEmail").value.trim(),
                    password: $("phLoginPassword").value,
                    role: "pharmacy"
                })
            });
            currentPharmacy = data.user;
            rebuildSidebar();
            showPage("pharmacyDashboard");
            toast("Welcome, " + currentPharmacy.fullName);
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
async function loadPharmacyDashboard() {
    if ($("pharmacyWelcome")) $("pharmacyWelcome").textContent = `Welcome, ${currentPharmacy.fullName}`;
    try {
        const data = await api("/api/pharmacy/stats");
        const s = data.stats;
        $("pharmacyStats").innerHTML = `
            <div class="stat-card"><b>${s.total_meds}</b><span>Total medicines</span></div>
            <div class="stat-card"><b>${s.normal_meds}</b><span>Normal</span></div>
            <div class="stat-card"><b>${s.special_meds}</b><span>Special</span></div>
            <div class="stat-card"><b>${s.out_of_stock}</b><span>Out of stock</span></div>
            <div class="stat-card"><b>${s.dispensed_week}</b><span>Dispensed (7d)</span></div>
            <div class="stat-card"><b>${s.dispensed_total}</b><span>Total dispensed</span></div>`;
    } catch (err) { toast(err.message, "error"); }
}

// ------------------------------------------------------------
// SEARCH PATIENT
// ------------------------------------------------------------
function loadPharmacySearch() {
    $("patientSearchResult").innerHTML = "";
    $("mcardSearchInput").value = "";
    $("mcardSearchInput")?.focus();
}

async function searchPatient() {
    const id = $("mcardSearchInput").value.trim();
    if (!id) return toast("Enter an MCard ID.", "error");
    const wrap = $("patientSearchResult");
    wrap.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

    try {
        const data = await api(`/api/pharmacy/patient/${encodeURIComponent(id)}`);
        currentPatient = data.patient;

        wrap.innerHTML = `
            <div class="panel">
                <div class="panel-heading">
                    <h3><i class="fa-solid fa-id-card"></i> ${escapeHtml(currentPatient.fullName)}</h3>
                    <span class="badge font-mono">${escapeHtml(currentPatient.mcardId)}</span>
                </div>
                <div class="form-grid">
                    <div><b>Mobile:</b> ${escapeHtml(currentPatient.mobile)}</div>
                    <div><b>Blood:</b> ${escapeHtml(currentPatient.bloodGroup || "—")}</div>
                    <div class="col-span-full"><b>Allergies:</b> ${escapeHtml(currentPatient.allergies || "None")}</div>
                    <div class="col-span-full"><b>Diseases:</b> ${escapeHtml(currentPatient.diseases || "None")}</div>
                    <div class="col-span-full"><b>Emergency:</b> ${escapeHtml(currentPatient.emergencyContactName || "—")} · ${escapeHtml(currentPatient.emergencyContactNumber || "")}</div>
                </div>

                <h3 class="section-subtitle-line">
                    <i class="fa-solid fa-prescription"></i> Prescriptions
                </h3>

                ${data.prescriptions.length === 0
                    ? `<div class="notice mt-14"><i class="fa-solid fa-circle-info"></i><span>No prescriptions on record.</span></div>`
                    : `<div class="table-wrap mt-14">
                        <table>
                            <thead><tr><th>Medicine</th><th>Doctor</th><th>Dosage</th><th>Duration</th><th>Date</th><th>Action</th></tr></thead>
                            <tbody>${data.prescriptions.map(p => `
                                <tr>
                                    <td><b>${escapeHtml(p.medicineName)}</b></td>
                                    <td>${escapeHtml(p.doctorName)}</td>
                                    <td>${escapeHtml(p.dosage || "—")}</td>
                                    <td>${p.durationDays ? p.durationDays + " days" : "—"}</td>
                                    <td>${new Date(p.prescribedAt).toLocaleDateString()}</td>
                                    <td>
                                        <button class="table-btn approve" onclick="openDispense('${p.id}', '${escapeHtml(p.medicineName).replace(/'/g, "&#039;")}')">
                                             <i class="fa-solid fa-check"></i> Dispense
                                        </button>
                                    </td>
                                </tr>`).join("")}
                            </tbody>
                        </table>
                    </div>`}
            </div>`;
    } catch (err) {
        wrap.innerHTML = `<div class="notice warning"><i class="fa-solid fa-triangle-exclamation"></i><span>${escapeHtml(err.message)}</span></div>`;
    }
}

function openDispense(prescriptionId, medicineName) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>Dispense — ${escapeHtml(medicineName)}</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="dispenseForm">
                <label>Dispense as
                    <input id="dpDispensed" value="${escapeHtml(medicineName)}" required>
                </label>
                <label class="checkbox-label-row mt-14">
                    <input type="checkbox" id="dpSubstituted" class="checkbox-inline">
                    Substituted (different brand or generic)
                </label>
                <label class="checkbox-label-row mt-8">
                    <input type="checkbox" id="dpNotDispensed" class="checkbox-inline">
                    Not dispensed (out of stock)
                </label>
                <label class="mt-14">Feedback / reason
                    <textarea id="dpFeedback" rows="3" placeholder="e.g. Substituted with equivalent generic, or 'Out of stock'"></textarea>
                </label>
                <button class="btn btn-primary full mt-14" type="submit">
                    <i class="fa-solid fa-floppy-disk"></i> Record
                </button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    $("dispenseForm").onsubmit = async e => {
        e.preventDefault();
        try {
            const body = {
                mcardId: currentPatient.mcardId,
                prescriptionId,
                originalMedicine: medicineName,
                dispensedMedicine: $("dpNotDispensed").checked ? null : $("dpDispensed").value.trim(),
                wasSubstituted: $("dpSubstituted").checked,
                notDispensed: $("dpNotDispensed").checked,
                feedback: $("dpFeedback").value.trim()
            };
            await api("/api/pharmacy/dispense", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            toast("Dispense recorded.");
            overlay.remove();
        } catch (err) { toast(err.message, "error"); }
    };
}

// ------------------------------------------------------------
// INVENTORY
// ------------------------------------------------------------
async function loadInventory() {
    const wrap = $("inventoryList");
    if (!wrap) return;
    wrap.innerHTML = `<div class="loading-box full-col">
        <i class="fa-solid fa-spinner fa-spin"></i></div>`;

    document.querySelectorAll(".tabs .tab").forEach(t => {
        t.classList.toggle("active", t.dataset.category === currentCategory);
        t.onclick = () => { currentCategory = t.dataset.category; loadInventory(); };
    });

    try {
        const qs = new URLSearchParams();
        if (currentCategory !== "all") qs.append("category", currentCategory);
        const search = $("inventorySearchInput")?.value.trim();
        if (search) qs.append("search", search);

        const data = await api("/api/pharmacy/inventory?" + qs);
        inventoryCache = data.medicines || [];

        if (inventoryCache.length === 0) {
            wrap.innerHTML = `<div class="notice col-span-full"><i class="fa-solid fa-circle-info"></i>
                <span>No medicines in inventory. Add one to get started.</span></div>`;
            return;
        }

        wrap.innerHTML = inventoryCache.map(m => `
            <div class="inventory-card ${m.category === "special" ? "special" : ""} ${m.stock === 0 ? "out-of-stock" : ""}">
                <h4>${escapeHtml(m.name)}</h4>
                ${m.genericName ? `<div class="generic">${escapeHtml(m.genericName)}</div>` : ""}
                <div class="inventory-tags">
                    <span class="inv-tag ${m.category === "special" ? "special" : ""}">${m.category}</span>
                    ${m.strength ? `<span class="inv-tag">${escapeHtml(m.strength)}</span>` : ""}
                    ${m.form ? `<span class="inv-tag">${escapeHtml(m.form)}</span>` : ""}
                    ${m.stock === 0 ? `<span class="inv-tag out">OUT OF STOCK</span>` : `<span class="inv-tag">Stock: ${m.stock}</span>`}
                </div>
                ${m.price != null ? `<div class="inventory-price">৳ ${m.price}</div>` : ""}
                <div class="inventory-actions">
                    <button class="table-btn" onclick="openEditInventory('${m.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="table-btn remove" onclick="deleteInventory('${m.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`).join("");
    } catch (err) { toast(err.message, "error"); }
}

function openAddMedicine() {
    openInventoryModal();
}

function openEditInventory(id) {
    const m = inventoryCache.find(x => x.id === id);
    if (m) openInventoryModal(m);
}

function openInventoryModal(existing = null) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-card">
            <div class="panel-heading">
                <h3>${existing ? "Edit" : "Add"} Medicine</h3>
                <button class="btn btn-soft" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
            <form id="invForm">
                <div class="form-grid">
                    <label>Name <input id="ivName" value="${escapeHtml(existing?.name || "")}" required></label>
                    <label>Generic name <input id="ivGeneric" value="${escapeHtml(existing?.genericName || "")}"></label>
                    <label>Category
                        <select id="ivCategory">
                            <option value="normal" ${existing?.category === "normal" ? "selected" : ""}>Normal</option>
                            <option value="special" ${existing?.category === "special" ? "selected" : ""}>Special</option>
                        </select>
                    </label>
                    <label>Strength <input id="ivStrength" value="${escapeHtml(existing?.strength || "")}" placeholder="e.g. 500mg"></label>
                    <label>Form <input id="ivForm" value="${escapeHtml(existing?.form || "")}" placeholder="tablet, syrup, injection"></label>
                    <label>Manufacturer <input id="ivManufacturer" value="${escapeHtml(existing?.manufacturer || "")}"></label>
                    <label>Stock <input id="ivStock" type="number" min="0" value="${existing?.stock ?? 0}"></label>
                    <label>Price <input id="ivPrice" type="number" step="0.01" min="0" value="${existing?.price ?? ""}"></label>
                </div>
                <button class="btn btn-primary full mt-14" type="submit">Save</button>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    $("invForm").onsubmit = async e => {
        e.preventDefault();
        const body = {
            name: $("ivName").value.trim(),
            genericName: $("ivGeneric").value.trim(),
            category: $("ivCategory").value,
            strength: $("ivStrength").value.trim(),
            form: $("ivForm").value.trim(),
            manufacturer: $("ivManufacturer").value.trim(),
            stock: parseInt($("ivStock").value, 10) || 0,
            price: $("ivPrice").value ? parseFloat($("ivPrice").value) : null
        };
        try {
            if (existing) {
                await api(`/api/pharmacy/inventory/${existing.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                toast("Updated.");
            } else {
                await api("/api/pharmacy/inventory", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                toast("Added.");
            }
            overlay.remove();
            loadInventory();
        } catch (err) { toast(err.message, "error"); }
    };
}

async function deleteInventory(id) {
    if (!confirm("Delete this medicine from inventory?")) return;
    try {
        await api(`/api/pharmacy/inventory/${id}`, { method: "DELETE" });
        toast("Deleted.");
        loadInventory();
    } catch (err) { toast(err.message, "error"); }
}

document.addEventListener("DOMContentLoaded", () => {
    $("inventorySearchInput")?.addEventListener("input", debounce(loadInventory, 300));
});

function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

// ------------------------------------------------------------
// DISPENSE HISTORY
// ------------------------------------------------------------
async function loadDispenseHistory() {
    const wrap = $("pharmacyHistoryList");
    if (!wrap) return;
    wrap.innerHTML = `<div class="loading-box"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
    try {
        const data = await api("/api/pharmacy/dispense-history");
        const records = data.records || [];
        if (records.length === 0) {
            wrap.innerHTML = `<div class="notice"><i class="fa-solid fa-circle-info"></i><span>No dispense records yet.</span></div>`;
            return;
        }
        wrap.innerHTML = `<div class="panel"><div class="table-wrap"><table>
            <thead><tr><th>MCard ID</th><th>Original</th><th>Dispensed</th><th>Status</th><th>Feedback</th><th>When</th></tr></thead>
            <tbody>${records.map(r => `
                <tr>
                    <td class="text-mono-sm">${escapeHtml(r.mcardId)}</td>
                    <td>${escapeHtml(r.originalMedicine || "—")}</td>
                    <td>${escapeHtml(r.dispensedMedicine || "—")}</td>
                    <td>${r.notDispensed ? `<span class="status rejected">Not dispensed</span>`
                        : r.wasSubstituted ? `<span class="status pending">Substituted</span>`
                        : `<span class="status approved">Dispensed</span>`}</td>
                    <td class="text-muted-xs2">${escapeHtml(r.feedback || "—")}</td>
                    <td>${new Date(r.dispensedAt).toLocaleString()}</td>
                </tr>`).join("")}</tbody>
        </table></div></div>`;
    } catch (err) { toast(err.message, "error"); }
}

// ------------------------------------------------------------
// PROFILE
// ------------------------------------------------------------
async function loadPharmacyProfile() {
    const panel = $("pharmacyProfilePanel");
    if (!panel) return;
    try {
        const data = await api("/api/pharmacy/profile");
        const p = data.pharmacy;
        panel.innerHTML = `
            <form id="pharmacyProfileForm">
                <div class="form-grid">
                    <label>Pharmacy name <input id="ppName" value="${escapeHtml(p.pharmacyName)}"></label>
                    <label>Email <input value="${escapeHtml(p.email)}" disabled></label>
                    <label>License number <input id="ppLicense" value="${escapeHtml(p.licenseNumber || "")}"></label>
                    <label>Phone <input id="ppPhone" value="${escapeHtml(p.phone || "")}"></label>
                    <label class="col-span-full">Address <textarea id="ppAddress" rows="3">${escapeHtml(p.address || "")}</textarea></label>
                </div>
                <button class="btn btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button>
            </form>`;
        $("pharmacyProfileForm").onsubmit = async e => {
            e.preventDefault();
            try {
                await api("/api/pharmacy/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pharmacyName: $("ppName").value.trim(),
                        licenseNumber: $("ppLicense").value.trim(),
                        phone: $("ppPhone").value.trim(),
                        address: $("ppAddress").value.trim()
                    })
                });
                toast("Profile updated.");
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

        if (data.loggedIn && data.role === "pharmacy" && data.user) {
            currentPharmacy = data.user;
            rebuildSidebar();
            showPage("pharmacyDashboard");
        } else if (data.loggedIn && data.role && data.role !== "pharmacy") {
            if (data.role === "doctor") { window.location.href = "/doctor"; return; }
            if (data.role === "patient") { window.location.href = "/"; return; }
            if (data.role === "admin") { window.location.href = "/"; return; }
            rebuildSidebar();
            showPage("pharmacyLogin");
        } else {
            rebuildSidebar();
            showPage("pharmacyLogin");
        }
    } catch (err) {
        console.error("Boot error:", err);
        rebuildSidebar();
        showPage("pharmacyLogin");
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
window.searchPatient = searchPatient;
window.openAddMedicine = openAddMedicine;
window.openEditInventory = openEditInventory;
window.deleteInventory = deleteInventory;
window.openDispense = openDispense;