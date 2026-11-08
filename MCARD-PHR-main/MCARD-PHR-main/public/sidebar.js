// ============================================================
// SIDEBAR RENDERER — shared across all portals
// ============================================================

const NAV_CONFIGS = {
    patient: [
        { id: "patientHome", icon: "fa-house", label: "Home" },
        { id: "dashboard", icon: "fa-gauge", label: "Dashboard" },
        { id: "reports", icon: "fa-folder-open", label: "Reports" },
        { id: "medicines", icon: "fa-pills", label: "Medicines" },
        { id: "appointments", icon: "fa-calendar-check", label: "Appointments" },
        { id: "doctors", icon: "fa-user-doctor", label: "Find Doctors" },
        { id: "trends", icon: "fa-chart-line", label: "Health Trends" },
        { id: "summary", icon: "fa-clipboard-list", label: "Summary" },
        { id: "mcard", icon: "fa-id-card", label: "My MCard" },
        { id: "editProfile", icon: "fa-user-pen", label: "Edit Profile" },
        { id: "settings", icon: "fa-sliders", label: "Settings" }
    ],
    admin: [
        { id: "adminOverview", icon: "fa-gauge", label: "Overview" },
        { id: "adminUsers", icon: "fa-users", label: "Patients" },
        { id: "adminDoctors", icon: "fa-user-doctor", label: "Doctors" },
        { id: "adminPharmacies", icon: "fa-prescription-bottle-medical", label: "Pharmacies" },
        { id: "settings", icon: "fa-sliders", label: "Settings" }
    ],
    doctor: [
        { id: "doctorDashboard", icon: "fa-gauge", label: "Dashboard" },
        { id: "doctorRequests", icon: "fa-bell", label: "Requests", badge: "requestBadge" },
        { id: "doctorPatients", icon: "fa-users", label: "My Patients" },
        { id: "doctorSchedule", icon: "fa-calendar-check", label: "Schedule" },
        { id: "doctorProfile", icon: "fa-user-pen", label: "Profile" },
        { id: "settings", icon: "fa-sliders", label: "Settings" }
    ],
    pharmacy: [
        { id: "pharmacyDashboard", icon: "fa-gauge", label: "Dashboard" },
        { id: "pharmacySearch", icon: "fa-magnifying-glass", label: "Search Patient" },
        { id: "pharmacyInventory", icon: "fa-boxes-stacked", label: "Inventory" },
        { id: "pharmacyHistory", icon: "fa-clock-rotate-left", label: "Dispense History" },
        { id: "pharmacyProfile", icon: "fa-user-pen", label: "Profile" },
        { id: "settings", icon: "fa-sliders", label: "Settings" }
    ]
};

// NOTE: escapeHtml is defined in app.js / doctor.js / pharmacy.js (one per portal).

function renderSidebar({ role, portalTitle, portalSubtitle, user }) {
    const el = document.getElementById("sidebar");
    if (!el) return;

    const links = NAV_CONFIGS[role] || [];
    const initial = (user?.fullName || user?.username || "U").trim().charAt(0).toUpperCase();

    el.innerHTML = `
        <div class="sidebar-brand">
            <span class="brand-logo"><i class="fa-solid fa-heart-pulse"></i></span>
            <div class="sidebar-brand-text">
                <strong data-i18n="app.name">${escapeHtml(portalTitle || "MCARD-PHR")}</strong>
                <small data-i18n="app.tagline">${escapeHtml(portalSubtitle || "Your Health, Our Responsibility")}</small>
            </div>
        </div>

        <div class="sidebar-user">
            ${user?.profilePicture
                ? `<img src="${escapeHtml(user.profilePicture)}" alt="Profile">`
                : `<div class="user-initial">${escapeHtml(initial)}</div>`}
            <div class="sidebar-user-info">
                <strong>${escapeHtml(user?.fullName || user?.username || "User")}</strong>
                <small>${escapeHtml(user?.mcardId || user?.email || "")}</small>
            </div>
        </div>

        <nav class="sidebar-nav" id="sidebarNav">
            ${links.map(l => `
                <button class="sidebar-link" data-page="${l.id}" type="button">
                    <i class="fa-solid ${l.icon}"></i>
                    <span data-i18n="nav.${l.id}">${escapeHtml(l.label)}</span>
                    ${l.badge ? `<span class="badge-dot hidden" id="${l.badge}">0</span>` : ""}
                </button>
            `).join("")}
        </nav>

        <div class="sidebar-footer">
            <button class="sidebar-link" data-action="toggle-theme" type="button">
                <i class="fa-solid fa-moon"></i>
                <span data-i18n="nav.darkMode">Dark mode</span>
            </button>
            <button class="sidebar-link" id="langToggle" type="button">
                <i class="fa-solid fa-globe"></i>
                <span>বাংলা</span>
            </button>
            <button class="sidebar-link" data-action="logout" type="button">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span data-i18n="nav.logout">Logout</span>
            </button>
        </div>
    `;

    // ---- Apply translations to the newly rendered sidebar ----
    if (typeof applyTranslations === "function") {
        applyTranslations(el);
    }
    if (typeof renderLanguageToggle === "function") {
        renderLanguageToggle();
    }

    // ---- Wire up navigation buttons ----
    el.querySelectorAll(".sidebar-link[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            const page = btn.dataset.page;
            if (typeof showPage === "function") showPage(page);
        });
    });

    // ---- Dark mode toggle ----
    el.querySelector('[data-action="toggle-theme"]')?.addEventListener("click", () => {
        if (typeof toggleDarkMode === "function") toggleDarkMode();
    });

    // ---- Logout ----
    el.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
        if (typeof logout === "function") logout();
    });
}function renderSidebar({ role, portalTitle, portalSubtitle, user }) {
    const el = document.getElementById("sidebar");
    if (!el) return;

    const links = NAV_CONFIGS[role] || [];
    const initial = (user?.fullName || user?.username || "U").trim().charAt(0).toUpperCase();

    el.innerHTML = `
        <div class="sidebar-brand">
            <span class="brand-logo"><i class="fa-solid fa-heart-pulse"></i></span>
            <div class="sidebar-brand-text">
                <strong data-i18n="app.name">${escapeHtml(portalTitle || "MCARD-PHR")}</strong>
                <small data-i18n="app.tagline">${escapeHtml(portalSubtitle || "Your Health, Our Responsibility")}</small>
            </div>
        </div>

        <div class="sidebar-user">
            ${user?.profilePicture
                ? `<img src="${escapeHtml(user.profilePicture)}" alt="Profile">`
                : `<div class="user-initial">${escapeHtml(initial)}</div>`}
            <div class="sidebar-user-info">
                <strong>${escapeHtml(user?.fullName || user?.username || "User")}</strong>
                <small>${escapeHtml(user?.mcardId || user?.email || "")}</small>
            </div>
        </div>

        <nav class="sidebar-nav" id="sidebarNav">
            ${links.map(l => `
                <button class="sidebar-link" data-page="${l.id}" type="button">
                    <i class="fa-solid ${l.icon}"></i>
                    <span data-i18n="nav.${l.id}">${escapeHtml(l.label)}</span>
                    ${l.badge ? `<span class="badge-dot hidden" id="${l.badge}">0</span>` : ""}
                </button>
            `).join("")}
        </nav>

        <div class="sidebar-footer">
            <button class="sidebar-link" data-action="toggle-theme" type="button">
                <i class="fa-solid fa-moon"></i>
                <span data-i18n="nav.darkMode">Dark mode</span>
            </button>
            <button class="sidebar-link" id="langToggle" type="button">
                <i class="fa-solid fa-globe"></i>
                <span>বাংলা</span>
            </button>
            <button class="sidebar-link" data-action="logout" type="button">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span data-i18n="nav.logout">Logout</span>
            </button>
        </div>
    `;

    // ---- Apply translations to the newly rendered sidebar ----
    if (typeof applyTranslations === "function") {
        applyTranslations(el);
    }
    if (typeof renderLanguageToggle === "function") {
        renderLanguageToggle();
    }

    // ---- Wire up navigation buttons ----
    el.querySelectorAll(".sidebar-link[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            const page = btn.dataset.page;
            if (typeof showPage === "function") showPage(page);
        });
    });

    // ---- Dark mode toggle ----
    el.querySelector('[data-action="toggle-theme"]')?.addEventListener("click", () => {
        if (typeof toggleDarkMode === "function") toggleDarkMode();
    });

    // ---- Logout ----
    el.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
        if (typeof logout === "function") logout();
    });
}

function setActiveSidebarLink(pageId) {
    document.querySelectorAll(".sidebar-link[data-page]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === pageId);
    });
}

function setSidebarBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
        el.textContent = count > 99 ? "99+" : count;
        el.classList.remove("hidden");
    } else {
        el.classList.add("hidden");
    }
}

// Mobile sidebar toggle
document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");

    if (toggle && sidebar) {
        toggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            backdrop?.classList.toggle("show");
        });
    }
    if (backdrop && sidebar) {
        backdrop.addEventListener("click", () => {
            sidebar.classList.remove("open");
            backdrop.classList.remove("show");
        });
    }

    document.querySelectorAll(".sidebar-link").forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 900) {
                sidebar?.classList.remove("open");
                backdrop?.classList.remove("show");
            }
        });
    });
});