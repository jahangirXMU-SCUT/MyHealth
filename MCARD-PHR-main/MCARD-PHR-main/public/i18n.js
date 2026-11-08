// ============================================================
// MCARD-PHR — i18n (English + Bengali) — COMPLETE
// ============================================================

const TRANSLATIONS = {
    en: {
        // ---- App / brand ----
        "app.name": "MCARD-PHR",
        "app.tagline": "Your Health, Our Responsibility",

        // ---- Sidebar nav ----
        "nav.home": "Home",
        "nav.patientHome": "Home",
        "nav.dashboard": "Dashboard",
        "nav.reports": "Reports",
        "nav.medicines": "Medicines",
        "nav.appointments": "Appointments",
        "nav.doctors": "Find Doctors",
        "nav.findDoctors": "Find Doctors",
        "nav.trends": "Health Trends",
        "nav.summary": "Summary",
        "nav.mcard": "My MCard",
        "nav.editProfile": "Edit Profile",
        "nav.settings": "Settings",
        "nav.logout": "Logout",
        "nav.darkMode": "Dark mode",
        "nav.language": "Language",

        // ---- Hero (guest) ----
        "hero.eyebrow": "Personal health organizer",
        "hero.title.part1": "Your Health,",
        "hero.title.part2": "Our Responsibility.",
        "hero.description": "Keep your health records, prescriptions, appointments, and emergency contact in one secure place. Doctors and pharmacies can now collaborate through MCARD-PHR.",
        "hero.getStarted": "Get Started",
        "hero.doctorLogin": "Doctor Login",
        "hero.pharmacyLogin": "Pharmacy Login",
        "hero.reports": "Reports",
        "hero.reportsDesc": "All in one place",
        "hero.qr": "Emergency QR",
        "hero.qrDesc": "Quick contact access",
        "hero.mcard": "MCard ID",
        "hero.mcardDesc": "Unique health identity",
        "hero.feature.profile": "Personal Profile",
        "hero.feature.profileDesc": "Contact, address, allergy and emergency information all in one place.",
        "hero.feature.doctors": "Direct Doctor Requests",
        "hero.feature.doctorsDesc": "Send appointment requests straight to your preferred doctor.",
        "hero.feature.pharmacy": "Pharmacy Integration",
        "hero.feature.pharmacyDesc": "Any pharmacy can scan your MCard and see your prescriptions instantly.",

        // ---- Auth ----
        "auth.login": "Login",
        "auth.login.title": "Welcome back",
        "auth.login.subtitle": "Sign in to your MCARD-PHR account.",
        "auth.register": "Create Account",
        "auth.register.title": "Create your MCARD-PHR profile",
        "auth.register.subtitle": "Your account will be reviewed by the administrator before use.",
        "auth.newAccount": "New account",
        "auth.email": "Email",
        "auth.emailOrMobile": "Email or mobile number",
        "auth.password": "Password",
        "auth.fullName": "Full name",
        "auth.mobile": "Mobile number",
        "auth.dateOfBirth": "Date of birth",
        "auth.bloodGroup": "Blood group",
        "auth.homeAddress": "Home address",
        "auth.permanentAddress": "Permanent address",
        "auth.diseases": "Diseases / allergies",
        "auth.emergencyName": "Emergency contact name",
        "auth.emergencyNumber": "Emergency contact number",
        "auth.profilePicture": "Profile picture (optional)",
        "auth.submit": "Submit for Approval",
        "auth.section.personal": "Personal information",
        "auth.section.emergency": "Emergency contact",
        "auth.section.security": "Account security",
        "auth.noAccount": "Don't have an account?",
        "auth.hasAccount": "Already have an account?",
        "auth.signUp": "Create one",
        "auth.signIn": "Sign in",
        "auth.newDoctor": "New doctor?",
        "auth.newPharmacy": "New pharmacy?",
        "auth.registerHere": "Register here",
        "auth.doctorLogin": "Doctor Login",
        "auth.doctorLoginDesc": "Sign in to access your patient requests.",
        "auth.doctorRegister.title": "Join MCARD-PHR as a Doctor",
        "auth.doctorRegister.subtitle": "Fill in your details. Admin approval is required before login.",
        "auth.pharmacyLogin": "Pharmacy Login",
        "auth.pharmacyLoginDesc": "Access your inventory and patient prescriptions.",
        "auth.pharmacyRegister.title": "Register your Pharmacy",
        "auth.pharmacyRegister.subtitle": "Admin approval is required before login.",

        // ---- Patient home ----
        "home.welcome": "Welcome back!",
        "home.greeting": "Welcome back, {name}!",
        "home.safeInfo": "Your health information is safe and organized.",
        "home.dashboard": "Dashboard",
        "home.pendingMedicines": "Today's pending medicines",
        "home.manage": "Manage",

        // ---- Dashboard ----
        "dash.eyebrow": "Patient dashboard",
        "dash.welcome": "Welcome, {name}",
        "dash.approved": "Your account is approved. Keep your info up to date.",
        "dash.showReports": "Show all reports",
        "dash.showReportsDesc": "View your prescription and test reports.",
        "dash.downloadMCard": "Download MCard",
        "dash.downloadMCardDesc": "Printable PDF with your QR code.",
        "dash.medicines": "Medicines",
        "dash.medicinesDesc": "Track daily doses and remaining pills.",
        "dash.addReport": "Add report",
        "dash.addReportDesc": "Upload a new prescription.",
        "dash.appointments": "Appointments",
        "dash.appointmentsDesc": "Personal reminders + doctor requests.",
        "dash.findDoctors": "Find Doctors",
        "dash.findDoctorsDesc": "Browse doctors and request appointments.",
        "dash.summary": "Summary",
        "dash.summaryDesc": "Visited doctors + prescribed medicines.",
        "dash.trends": "Health Trends",
        "dash.trendsDesc": "Charts for vitals over time.",
        "dash.profileCompleteness": "Profile completeness",

        // ---- Edit profile ----
        "profile.eyebrow": "Account",
        "profile.title": "Edit My Profile",
        "profile.subtitle": "Update your personal and medical information.",

        // ---- Reports ----
        "rep.eyebrow": "Medical records",
        "rep.title": "All Reports",
        "rep.subtitle": "View your prescription and test reports.",
        "rep.add": "Add Report",
        "rep.newEyebrow": "New report",
        "rep.newTitle": "Add Prescription Report",
        "rep.newSubtitle": "Upload prescription and test images.",
        "rep.noReports": "No reports yet.",
        "rep.print": "Print",
        "rep.delete": "Delete",

        // ---- Appointments ----
        "apt.eyebrow": "Schedule",
        "apt.title": "My Appointments",
        "apt.subtitle": "Personal reminders and doctor requests.",
        "apt.addReminder": "Personal reminder",
        "apt.requestDoctor": "Request a doctor",
        "apt.noAppointments": "No appointments. ",
        "apt.addOne": "Add a reminder",
        "apt.or": " or ",
        "apt.requestOne": "request a doctor",
        "apt.status.requested": "Awaiting doctor",
        "apt.status.confirmed": "Confirmed",
        "apt.status.rejected": "Rejected",
        "apt.status.completed": "Completed",

        // ---- Find doctors ----
        "doc.eyebrow": "Doctor directory",
        "doc.title": "Find a Doctor",
        "doc.subtitle": "Browse doctors and request an appointment.",
        "doc.search": "Search by name or specialty...",
        "doc.request": "Request Appointment",
        "doc.noDoctors": "No doctors found.",
        "doc.fee": "Fee",

        // ---- Medicines ----
        "med.eyebrow": "Prescriptions",
        "med.title": "My Medicines",
        "med.subtitle": "Track daily doses and see what's left.",
        "med.add": "Add Medicine",
        "med.today": "Today's doses",
        "med.all": "All medicines",
        "med.noMedicinesToday": "No medicines scheduled for today.",
        "med.addFirst": "Add your first medicine",
        "med.morning": "Morning",
        "med.noon": "Noon",
        "med.night": "Night",
        "med.pills": "pills",
        "med.left": "left",
        "med.taken": "taken",
        "med.day": "Day",
        "med.of": "of",
        "med.complete": "Complete",
        "med.active": "Active",
        "med.inactive": "Inactive",
        "med.starts": "Starts",
        "med.ends": "Ends",
        "med.delete": "Delete",
        "med.name": "Medicine name",
        "med.dosageMorning": "Morning pills",
        "med.dosageNoon": "Noon pills",
        "med.dosageNight": "Night pills",
        "med.startDate": "Start date",
        "med.duration": "Duration (days)",
        "med.notes": "Notes",
        "med.save": "Save Medicine",

        // ---- Trends ----
        "trends.eyebrow": "Health metrics",
        "trends.title": "Health Trends",
        "trends.subtitle": "Track your vitals over time.",
        "trends.addReading": "Add Reading",
        "trends.metric": "Metric",
        "trends.recent": "Recent readings",
        "trends.noReadings": "No readings yet for this metric.",
        "trends.range.7": "7 days",
        "trends.range.30": "30 days",
        "trends.range.90": "90 days",
        "trends.range.365": "1 year",
        "trends.range.all": "All",

        // ---- Summary ----
        "sum.eyebrow": "Health history",
        "sum.title": "Medical Summary",
        "sum.subtitle": "All doctors you've visited and all medicines prescribed to you.",
        "sum.visitedDoctors": "Visited Doctors",
        "sum.prescribedMeds": "Prescribed Medicines",
        "sum.noVisits": "No visits yet.",
        "sum.noPrescriptions": "No prescriptions yet.",
        "sum.col.doctor": "Doctor",
        "sum.col.degree": "Degree",
        "sum.col.specialization": "Specialization",
        "sum.col.lastWorked": "Last worked place",
        "sum.col.visitDate": "Visit date",
        "sum.col.medicine": "Medicine",
        "sum.col.dosage": "Dosage",
        "sum.col.duration": "Duration",
        "sum.col.prescribedOn": "Prescribed on",
        "sum.col.notes": "Notes",

        // ---- MCard ----
        "mcard.eyebrow": "Health identity",
        "mcard.title": "My MCard",
        "mcard.subtitle": "Download or print your unique MCard PDF.",
        "mcard.download": "Download PDF",

        // ---- Settings ----
        "set.eyebrow": "Appearance",
        "set.title": "Customize MCARD-PHR",
        "set.subtitle": "Change appearance and text size.",
        "set.darkMode": "Dark mode",
        "set.darkModeDesc": "Switch light/dark appearance.",
        "set.fontSize": "Font size",
        "set.fontSizeDesc": "Adjust global text size.",
        "set.textPreview": "Text preview",
        "set.normal": "Normal font size",
        "set.small": "Small font size",
        "set.large": "Large font size",
        "set.extraLarge": "Extra large font size",
        "set.maximum": "Maximum font size",

        // ---- Admin ----
        "admin.eyebrow": "Administrator",
        "admin.overview": "Overview",
        "admin.overviewSubtitle": "At-a-glance statistics across MCARD-PHR.",
        "admin.patients": "Patients",
        "admin.patientsTitle": "Patient Accounts",
        "admin.patientsSubtitle": "Approve, inspect and manage patient users.",
        "admin.doctors": "Doctors",
        "admin.doctorsTitle": "Doctor Accounts",
        "admin.doctorsSubtitle": "Approve, disable, or remove doctors.",
        "admin.pharmacies": "Pharmacies",
        "admin.pharmaciesTitle": "Pharmacy Accounts",
        "admin.pharmaciesSubtitle": "Approve, disable, or remove pharmacies.",
        "admin.allPatients": "All patients",
        "admin.allDoctors": "All doctors",
        "admin.allPharmacies": "All pharmacies",
        "admin.col.name": "Name",
        "admin.col.mobile": "Mobile",
        "admin.col.mcardId": "MCard ID",
        "admin.col.status": "Status",
        "admin.col.created": "Created",
        "admin.col.action": "Action",
        "admin.col.profession": "Profession",
        "admin.col.email": "Email",
        "admin.col.patients": "Patients",
        "admin.col.pharmacy": "Pharmacy",
        "admin.col.phone": "Phone",
        "admin.col.medicines": "Medicines",

        // ---- Chat ----
        "chat.title": "MCARD-PHR Assistant",
        "chat.subtitle": "Ask about your data",
        "chat.placeholder": "Ask about medicines, appointments...",
        "chat.welcome": "Hi {name}! 👋 Ask me about your medicines, appointments or reports.",
        "chat.offline": "Offline mode",
        "chat.thinking": "Thinking...",

        // ---- Common ----
        "common.save": "Save",
        "common.cancel": "Cancel",
        "common.close": "Close",
        "common.delete": "Delete",
        "common.edit": "Edit",
        "common.view": "View",
        "common.back": "Back",
        "common.refresh": "Refresh",
        "common.search": "Search",
        "common.loading": "Loading...",
        "common.error": "Something went wrong.",
        "common.yes": "Yes",
        "common.no": "No",
        // ---- Doctor portal nav ----
        "nav.doctorDashboard": "Dashboard",
        "nav.doctorRequests": "Appointment Requests",
        "nav.doctorPatients": "My Patients",
        "nav.doctorSchedule": "Schedule",
        "nav.doctorProfile": "Profile",

        // ---- Pharmacy portal nav ----
        "nav.pharmacyDashboard": "Dashboard",
        "nav.pharmacySearch": "Search Patient",
        "nav.pharmacyInventory": "Inventory",
        "nav.pharmacyHistory": "Dispense History",
        "nav.pharmacyProfile": "Profile",

        // ---- Admin portal nav ----
        "nav.adminOverview": "Overview",
        "nav.adminUsers": "Patients",
        "nav.adminDoctors": "Doctors",
        "nav.adminPharmacies": "Pharmacies"
    },

    bn: {
        // ---- App / brand ----
        "app.name": "এমকার্ড-পিএইচআর",
        "app.tagline": "আপনার স্বাস্থ্য, আমাদের দায়িত্ব",

        // ---- Sidebar nav ----
        "nav.home": "হোম",
        "nav.patientHome": "হোম",
        "nav.dashboard": "ড্যাশবোর্ড",
        "nav.reports": "রিপোর্ট",
        "nav.medicines": "ঔষধ",
        "nav.appointments": "অ্যাপয়েন্টমেন্ট",
        "nav.doctors": "ডাক্তার খুঁজুন",
        "nav.findDoctors": "ডাক্তার খুঁজুন",
        "nav.trends": "স্বাস্থ্য প্রবণতা",
        "nav.summary": "সারসংক্ষেপ",
        "nav.mcard": "আমার এমকার্ড",
        "nav.editProfile": "প্রোফাইল সম্পাদনা",
        "nav.settings": "সেটিংস",
        "nav.logout": "লগ আউট",
        "nav.darkMode": "ডার্ক মোড",
        "nav.language": "ভাষা",

        // ---- Hero ----
        "hero.eyebrow": "ব্যক্তিগত স্বাস্থ্য সংগঠক",
        "hero.title.part1": "আপনার স্বাস্থ্য,",
        "hero.title.part2": "আমাদের দায়িত্ব।",
        "hero.description": "আপনার স্বাস্থ্য রেকর্ড, প্রেসক্রিপশন, অ্যাপয়েন্টমেন্ট এবং আপৎকালীন যোগাযোগ এক জায়গায় নিরাপদে রাখুন। ডাক্তার এবং ফার্মেসিরা এখন এমকার্ড-পিএইচআরের মাধ্যমে সহযোগিতা করতে পারেন।",
        "hero.getStarted": "শুরু করুন",
        "hero.doctorLogin": "ডাক্তার লগইন",
        "hero.pharmacyLogin": "ফার্মেসি লগইন",
        "hero.reports": "রিপোর্ট",
        "hero.reportsDesc": "সব এক জায়গায়",
        "hero.qr": "আপৎকালীন QR",
        "hero.qrDesc": "দ্রুত যোগাযোগ",
        "hero.mcard": "এমকার্ড আইডি",
        "hero.mcardDesc": "অনন্য স্বাস্থ্য পরিচয়",
        "hero.feature.profile": "ব্যক্তিগত প্রোফাইল",
        "hero.feature.profileDesc": "যোগাযোগ, ঠিকানা, অ্যালার্জি এবং আপৎকালীন তথ্য এক জায়গায়।",
        "hero.feature.doctors": "সরাসরি ডাক্তারের অনুরোধ",
        "hero.feature.doctorsDesc": "আপনার পছন্দের ডাক্তারের কাছে সরাসরি অ্যাপয়েন্টমেন্টের অনুরোধ পাঠান।",
        "hero.feature.pharmacy": "ফার্মেসি ইন্টিগ্রেশন",
        "hero.feature.pharmacyDesc": "যেকোনো ফার্মেসি আপনার এমকার্ড স্ক্যান করে সাথে সাথে প্রেসক্রিপশন দেখতে পারবে।",

        // ---- Auth ----
        "auth.login": "লগ ইন",
        "auth.login.title": "স্বাগতম",
        "auth.login.subtitle": "আপনার অ্যাকাউন্টে সাইন ইন করুন।",
        "auth.register": "অ্যাকাউন্ট তৈরি করুন",
        "auth.register.title": "আপনার এমকার্ড-পিএইচআর প্রোফাইল তৈরি করুন",
        "auth.register.subtitle": "আপনার অ্যাকাউন্ট ব্যবহারের আগে অ্যাডমিন পর্যালোচনা করবেন।",
        "auth.newAccount": "নতুন অ্যাকাউন্ট",
        "auth.email": "ইমেইল",
        "auth.emailOrMobile": "ইমেইল বা মোবাইল নম্বর",
        "auth.password": "পাসওয়ার্ড",
        "auth.fullName": "পূর্ণ নাম",
        "auth.mobile": "মোবাইল নম্বর",
        "auth.dateOfBirth": "জন্ম তারিখ",
        "auth.bloodGroup": "রক্তের গ্রুপ",
        "auth.homeAddress": "বাসার ঠিকানা",
        "auth.permanentAddress": "স্থায়ী ঠিকানা",
        "auth.diseases": "রোগ / অ্যালার্জি",
        "auth.emergencyName": "আপৎকালীন যোগাযোগের নাম",
        "auth.emergencyNumber": "আপৎকালীন যোগাযোগের নম্বর",
        "auth.profilePicture": "প্রোফাইল ছবি (ঐচ্ছিক)",
        "auth.submit": "অনুমোদনের জন্য জমা দিন",
        "auth.section.personal": "ব্যক্তিগত তথ্য",
        "auth.section.emergency": "আপৎকালীন যোগাযোগ",
        "auth.section.security": "অ্যাকাউন্ট নিরাপত্তা",
        "auth.noAccount": "অ্যাকাউন্ট নেই?",
        "auth.hasAccount": "ইতিমধ্যে অ্যাকাউন্ট আছে?",
        "auth.signUp": "তৈরি করুন",
        "auth.signIn": "সাইন ইন",
        "auth.newDoctor": "নতুন ডাক্তার?",
        "auth.newPharmacy": "নতুন ফার্মেসি?",
        "auth.registerHere": "এখানে নিবন্ধন করুন",
        "auth.doctorLogin": "ডাক্তার লগইন",
        "auth.doctorLoginDesc": "আপনার রোগীর অনুরোধ অ্যাক্সেস করতে সাইন ইন করুন।",
        "auth.doctorRegister.title": "ডাক্তার হিসেবে এমকার্ড-পিএইচআরে যোগ দিন",
        "auth.doctorRegister.subtitle": "আপনার তথ্য পূরণ করুন। লগইনের আগে অ্যাডমিন অনুমোদন প্রয়োজন।",
        "auth.pharmacyLogin": "ফার্মেসি লগইন",
        "auth.pharmacyLoginDesc": "আপনার ইনভেন্টরি এবং রোগীর প্রেসক্রিপশন অ্যাক্সেস করুন।",
        "auth.pharmacyRegister.title": "আপনার ফার্মেসি নিবন্ধন করুন",
        "auth.pharmacyRegister.subtitle": "লগইনের আগে অ্যাডমিন অনুমোদন প্রয়োজন।",

        // ---- Patient home ----
        "home.welcome": "স্বাগতম!",
        "home.greeting": "স্বাগতম, {name}!",
        "home.safeInfo": "আপনার স্বাস্থ্য তথ্য নিরাপদ ও সংগঠিত।",
        "home.dashboard": "ড্যাশবোর্ড",
        "home.pendingMedicines": "আজকের বাকি ঔষধ",
        "home.manage": "পরিচালনা",

        // ---- Dashboard ----
        "dash.eyebrow": "রোগী ড্যাশবোর্ড",
        "dash.welcome": "স্বাগতম, {name}",
        "dash.approved": "আপনার অ্যাকাউন্ট অনুমোদিত। আপনার তথ্য হালনাগাদ রাখুন।",
        "dash.showReports": "সব রিপোর্ট দেখুন",
        "dash.showReportsDesc": "আপনার প্রেসক্রিপশন ও পরীক্ষার রিপোর্ট দেখুন।",
        "dash.downloadMCard": "এমকার্ড ডাউনলোড",
        "dash.downloadMCardDesc": "আপনার QR কোড সহ মুদ্রণযোগ্য PDF।",
        "dash.medicines": "ঔষধ",
        "dash.medicinesDesc": "প্রতিদিনের ডোজ ও বাকি ঔষধ ট্র্যাক করুন।",
        "dash.addReport": "রিপোর্ট যোগ করুন",
        "dash.addReportDesc": "নতুন প্রেসক্রিপশন আপলোড করুন।",
        "dash.appointments": "অ্যাপয়েন্টমেন্ট",
        "dash.appointmentsDesc": "ব্যক্তিগত রিমাইন্ডার + ডাক্তারের অনুরোধ।",
        "dash.findDoctors": "ডাক্তার খুঁজুন",
        "dash.findDoctorsDesc": "ডাক্তার দেখুন ও অ্যাপয়েন্টমেন্টের অনুরোধ করুন।",
        "dash.summary": "সারসংক্ষেপ",
        "dash.summaryDesc": "দেখা ডাক্তার + প্রেসক্রাইব করা ঔষধ।",
        "dash.trends": "স্বাস্থ্য প্রবণতা",
        "dash.trendsDesc": "সময়ের সাথে ভাইটালের চার্ট।",
        "dash.profileCompleteness": "প্রোফাইল সম্পূর্ণতা",

        // ---- Edit profile ----
        "profile.eyebrow": "অ্যাকাউন্ট",
        "profile.title": "আমার প্রোফাইল সম্পাদনা",
        "profile.subtitle": "আপনার ব্যক্তিগত ও চিকিৎসা তথ্য হালনাগাদ করুন।",

        // ---- Reports ----
        "rep.eyebrow": "চিকিৎসা রেকর্ড",
        "rep.title": "সব রিপোর্ট",
        "rep.subtitle": "আপনার প্রেসক্রিপশন ও পরীক্ষার রিপোর্ট দেখুন।",
        "rep.add": "রিপোর্ট যোগ করুন",
        "rep.newEyebrow": "নতুন রিপোর্ট",
        "rep.newTitle": "প্রেসক্রিপশন রিপোর্ট যোগ করুন",
        "rep.newSubtitle": "প্রেসক্রিপশন ও পরীক্ষার ছবি আপলোড করুন।",
        "rep.noReports": "এখনও কোনো রিপোর্ট নেই।",
        "rep.print": "প্রিন্ট",
        "rep.delete": "মুছুন",

        // ---- Appointments ----
        "apt.eyebrow": "সময়সূচি",
        "apt.title": "আমার অ্যাপয়েন্টমেন্ট",
        "apt.subtitle": "ব্যক্তিগত রিমাইন্ডার এবং ডাক্তারের অনুরোধ।",
        "apt.addReminder": "ব্যক্তিগত রিমাইন্ডার",
        "apt.requestDoctor": "ডাক্তারের অনুরোধ করুন",
        "apt.noAppointments": "কোনো অ্যাপয়েন্টমেন্ট নেই। ",
        "apt.addOne": "একটি রিমাইন্ডার যোগ করুন",
        "apt.or": " বা ",
        "apt.requestOne": "ডাক্তারের অনুরোধ করুন",
        "apt.status.requested": "ডাক্তারের অপেক্ষায়",
        "apt.status.confirmed": "নিশ্চিত",
        "apt.status.rejected": "প্রত্যাখ্যাত",
        "apt.status.completed": "সম্পন্ন",

        // ---- Find doctors ----
        "doc.eyebrow": "ডাক্তার ডিরেক্টরি",
        "doc.title": "ডাক্তার খুঁজুন",
        "doc.subtitle": "ডাক্তার দেখুন এবং অ্যাপয়েন্টমেন্টের অনুরোধ করুন।",
        "doc.search": "নাম বা বিশেষত্ব দিয়ে খুঁজুন...",
        "doc.request": "অ্যাপয়েন্টমেন্টের অনুরোধ",
        "doc.noDoctors": "কোনো ডাক্তার পাওয়া যায়নি।",
        "doc.fee": "ফি",

        // ---- Medicines ----
        "med.eyebrow": "প্রেসক্রিপশন",
        "med.title": "আমার ঔষধ",
        "med.subtitle": "প্রতিদিনের ডোজ ও বাকি ট্র্যাক করুন।",
        "med.add": "ঔষধ যোগ করুন",
        "med.today": "আজকের ডোজ",
        "med.all": "সব ঔষধ",
        "med.noMedicinesToday": "আজকের জন্য কোনো ঔষধ নেই।",
        "med.addFirst": "আপনার প্রথম ঔষধ যোগ করুন",
        "med.morning": "সকাল",
        "med.noon": "দুপুর",
        "med.night": "রাত",
        "med.pills": "বড়ি",
        "med.left": "বাকি",
        "med.taken": "নেওয়া হয়েছে",
        "med.day": "দিন",
        "med.of": "এর",
        "med.complete": "সম্পন্ন",
        "med.active": "সক্রিয়",
        "med.inactive": "নিষ্ক্রিয়",
        "med.starts": "শুরু",
        "med.ends": "শেষ",
        "med.delete": "মুছুন",
        "med.name": "ঔষধের নাম",
        "med.dosageMorning": "সকালের বড়ি",
        "med.dosageNoon": "দুপুরের বড়ি",
        "med.dosageNight": "রাতের বড়ি",
        "med.startDate": "শুরুর তারিখ",
        "med.duration": "সময়কাল (দিন)",
        "med.notes": "নোট",
        "med.save": "ঔষধ সংরক্ষণ করুন",

        // ---- Trends ----
        "trends.eyebrow": "স্বাস্থ্য মেট্রিক",
        "trends.title": "স্বাস্থ্য প্রবণতা",
        "trends.subtitle": "সময়ের সাথে আপনার ভাইটাল ট্র্যাক করুন।",
        "trends.addReading": "রিডিং যোগ করুন",
        "trends.metric": "মেট্রিক",
        "trends.recent": "সাম্প্রতিক রিডিং",
        "trends.noReadings": "এই মেট্রিকের জন্য এখনও কোনো রিডিং নেই।",
        "trends.range.7": "৭ দিন",
        "trends.range.30": "৩০ দিন",
        "trends.range.90": "৯০ দিন",
        "trends.range.365": "১ বছর",
        "trends.range.all": "সব",

        // ---- Summary ----
        "sum.eyebrow": "স্বাস্থ্য ইতিহাস",
        "sum.title": "চিকিৎসা সারসংক্ষেপ",
        "sum.subtitle": "আপনি যে সমস্ত ডাক্তার দেখেছেন এবং সমস্ত প্রেসক্রাইব করা ঔষধ।",
        "sum.visitedDoctors": "দেখা ডাক্তারগণ",
        "sum.prescribedMeds": "প্রেসক্রাইব করা ঔষধ",
        "sum.noVisits": "এখনও কোনো ভিজিট নেই।",
        "sum.noPrescriptions": "এখনও কোনো প্রেসক্রিপশন নেই।",
        "sum.col.doctor": "ডাক্তার",
        "sum.col.degree": "ডিগ্রি",
        "sum.col.specialization": "বিশেষত্ব",
        "sum.col.lastWorked": "শেষ কর্মস্থল",
        "sum.col.visitDate": "ভিজিটের তারিখ",
        "sum.col.medicine": "ঔষধ",
        "sum.col.dosage": "ডোজ",
        "sum.col.duration": "সময়কাল",
        "sum.col.prescribedOn": "প্রেসক্রাইব করা হয়েছে",
        "sum.col.notes": "নোট",

        // ---- MCard ----
        "mcard.eyebrow": "স্বাস্থ্য পরিচয়",
        "mcard.title": "আমার এমকার্ড",
        "mcard.subtitle": "আপনার অনন্য এমকার্ড PDF ডাউনলোড বা প্রিন্ট করুন।",
        "mcard.download": "PDF ডাউনলোড",

        // ---- Settings ----
        "set.eyebrow": "চেহারা",
        "set.title": "এমকার্ড-পিএইচআর কাস্টমাইজ করুন",
        "set.subtitle": "চেহারা এবং টেক্সট সাইজ পরিবর্তন করুন।",
        "set.darkMode": "ডার্ক মোড",
        "set.darkModeDesc": "হালকা/গাঢ় চেহারা পরিবর্তন করুন।",
        "set.fontSize": "ফন্ট সাইজ",
        "set.fontSizeDesc": "গ্লোবাল টেক্সট সাইজ সামঞ্জস্য করুন।",
        "set.textPreview": "টেক্সট প্রিভিউ",
        "set.normal": "স্বাভাবিক ফন্ট সাইজ",
        "set.small": "ছোট ফন্ট সাইজ",
        "set.large": "বড় ফন্ট সাইজ",
        "set.extraLarge": "অতিরিক্ত বড় ফন্ট সাইজ",
        "set.maximum": "সর্বোচ্চ ফন্ট সাইজ",

        // ---- Admin ----
        "admin.eyebrow": "অ্যাডমিনিস্ট্রেটর",
        "admin.overview": "সারসংক্ষেপ",
        "admin.overviewSubtitle": "এমকার্ড-পিএইচআর জুড়ে এক নজরে পরিসংখ্যান।",
        "admin.patients": "রোগী",
        "admin.patientsTitle": "রোগী অ্যাকাউন্ট",
        "admin.patientsSubtitle": "রোগী ব্যবহারকারীদের অনুমোদন, পরিদর্শন এবং পরিচালনা করুন।",
        "admin.doctors": "ডাক্তার",
        "admin.doctorsTitle": "ডাক্তার অ্যাকাউন্ট",
        "admin.doctorsSubtitle": "ডাক্তারদের অনুমোদন, নিষ্ক্রিয় বা মুছুন।",
        "admin.pharmacies": "ফার্মেসি",
        "admin.pharmaciesTitle": "ফার্মেসি অ্যাকাউন্ট",
        "admin.pharmaciesSubtitle": "ফার্মেসিগুলি অনুমোদন, নিষ্ক্রিয় বা মুছুন।",
        "admin.allPatients": "সব রোগী",
        "admin.allDoctors": "সব ডাক্তার",
        "admin.allPharmacies": "সব ফার্মেসি",
        "admin.col.name": "নাম",
        "admin.col.mobile": "মোবাইল",
        "admin.col.mcardId": "এমকার্ড আইডি",
        "admin.col.status": "অবস্থা",
        "admin.col.created": "তৈরি হয়েছে",
        "admin.col.action": "ক্রিয়া",
        "admin.col.profession": "পেশা",
        "admin.col.email": "ইমেইল",
        "admin.col.patients": "রোগী",
        "admin.col.pharmacy": "ফার্মেসি",
        "admin.col.phone": "ফোন",
        "admin.col.medicines": "ঔষধ",

        // ---- Chat ----
        "chat.title": "এমকার্ড-পিএইচআর সহকারী",
        "chat.subtitle": "আপনার ডেটা সম্পর্কে জিজ্ঞাসা করুন",
        "chat.placeholder": "ঔষধ, অ্যাপয়েন্টমেন্ট সম্পর্কে জিজ্ঞাসা করুন...",
        "chat.welcome": "হ্যালো {name}! 👋 ঔষধ, অ্যাপয়েন্টমেন্ট বা রিপোর্ট সম্পর্কে জিজ্ঞাসা করুন।",
        "chat.offline": "অফলাইন মোড",
        "chat.thinking": "চিন্তা করছি...",

        // ---- Common ----
        "common.save": "সংরক্ষণ",
        "common.cancel": "বাতিল",
        "common.close": "বন্ধ",
        "common.delete": "মুছুন",
        "common.edit": "সম্পাদনা",
        "common.view": "দেখুন",
        "common.back": "পিছনে",
        "common.refresh": "রিফ্রেশ",
        "common.search": "খুঁজুন",
        "common.loading": "লোড হচ্ছে...",
        "common.error": "কিছু ভুল হয়েছে।",
        "common.yes": "হ্যাঁ",
        "common.no": "না",
        // ---- Doctor portal nav ----
        "nav.doctorDashboard": "ড্যাশবোর্ড",
        "nav.doctorRequests": "অ্যাপয়েন্টমেন্টের অনুরোধ",
        "nav.doctorPatients": "আমার রোগী",
        "nav.doctorSchedule": "সময়সূচি",
        "nav.doctorProfile": "প্রোফাইল",

        // ---- Pharmacy portal nav ----
        "nav.pharmacyDashboard": "ড্যাশবোর্ড",
        "nav.pharmacySearch": "রোগী খুঁজুন",
        "nav.pharmacyInventory": "ইনভেন্টরি",
        "nav.pharmacyHistory": "ডিসপেন্স হিস্ট্রি",
        "nav.pharmacyProfile": "প্রোফাইল",

        // ---- Admin portal nav ----
        "nav.adminOverview": "সারসংক্ষেপ",
        "nav.adminUsers": "রোগী",
        "nav.adminDoctors": "ডাক্তারগণ",
        "nav.adminPharmacies": "ফার্মেসিগণ"
    }
};

let currentLang = localStorage.getItem("medhelper-lang") || "en";

function t(key, params = {}) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    let str = dict[key];
    if (str === undefined) str = TRANSLATIONS.en[key];
    if (str === undefined) return key; // fallback: show the key
    Object.keys(params).forEach(k => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), params[k]);
    });
    return str;
}

function applyTranslations(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const translated = t(key);
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            if (el.hasAttribute("placeholder")) el.placeholder = translated;
            else el.value = translated;
        } else {
            el.textContent = translated;
        }
    });

    root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });

    root.querySelectorAll("[data-i18n-title]").forEach(el => {
        el.title = t(el.getAttribute("data-i18n-title"));
    });

    document.documentElement.lang = currentLang;
}

function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem("medhelper-lang", lang);
    applyTranslations();
    document.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));
}

function getLanguage() {
    return currentLang;
}

function renderLanguageToggle() {
    const btn = document.getElementById("langToggle");
    if (!btn) return;
    const label = currentLang === "en" ? "বাংলা" : "English";
    const nextLang = currentLang === "en" ? "bn" : "en";
    btn.innerHTML = `<i class="fa-solid fa-globe"></i><span>${label}</span>`;
    btn.title = currentLang === "en" ? "Switch to Bengali" : "Switch to English";
    btn.onclick = () => setLanguage(nextLang);
}

document.addEventListener("DOMContentLoaded", () => {
    applyTranslations();
    renderLanguageToggle();
    document.addEventListener("languageChanged", renderLanguageToggle);
});

window.t = t;
window.setLanguage = setLanguage;
window.getLanguage = getLanguage;
window.applyTranslations = applyTranslations;
window.renderLanguageToggle = renderLanguageToggle;