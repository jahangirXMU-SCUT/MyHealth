// ============================================================
// ADMIN SPA — logic lives in app.js (shared with patient shell)
// ============================================================
// The admin role uses the same index.html + app.js.
// Sidebar swaps automatically based on currentUser.isAdmin.
//
// All admin functions are exported to window from app.js:
//   loadAdminUsers, loadAdminDoctors, loadAdminPharmacies,
//   adminUserAction, adminDoctorAction, adminPharmacyAction,
//   loadAdminOverview.
//
// No additional code needed here.