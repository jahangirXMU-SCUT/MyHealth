-- ============================================================
-- MCARD-PHR POSTGRESQL SCHEMA — v4
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- ADMINS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(80) UNIQUE NOT NULL,
    email           VARCHAR(150) UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(150),
    is_super        BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins (username);

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name                   VARCHAR(150) NOT NULL,
    mobile                      VARCHAR(30)  NOT NULL,
    email                       VARCHAR(150) UNIQUE NOT NULL,
    date_of_birth               DATE         NOT NULL,
    blood_group                 VARCHAR(8),
    home_address                TEXT,
    permanent_address           TEXT,
    diseases                    TEXT,
    allergies                   TEXT,
    other_diseases              TEXT,
    emergency_contact_name      VARCHAR(150),
    emergency_contact_number    VARCHAR(30),
    password_hash               TEXT NOT NULL,
    profile_picture             TEXT,
    status                      VARCHAR(20) DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected')),
    approved_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email   ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_mobile  ON users (mobile);
CREATE INDEX IF NOT EXISTS idx_users_status  ON users (status);

-- ------------------------------------------------------------
-- MCARDS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mcards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    mcard_id        VARCHAR(40) UNIQUE NOT NULL,
    issued_year     INTEGER NOT NULL,
    issued_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcards_id ON mcards (mcard_id);

-- ------------------------------------------------------------
-- DOCTORS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username                VARCHAR(80) UNIQUE,
    email                   VARCHAR(150) UNIQUE NOT NULL,
    password_hash           TEXT NOT NULL,
    full_name               VARCHAR(150) NOT NULL,
    degree                  VARCHAR(255),
    profession              VARCHAR(120),
    specialization          VARCHAR(120),
    last_worked_place       VARCHAR(200),
    experience_years        INTEGER,
    license_number          VARCHAR(80),
    consultation_fee        NUMERIC(10,2),
    bio                     TEXT,
    profile_picture         TEXT,
    status                  VARCHAR(20) DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
    is_active               BOOLEAN DEFAULT TRUE,
    approved_at             TIMESTAMPTZ,
    last_login_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doctors_email  ON doctors (email);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors (status);

-- ------------------------------------------------------------
-- PHARMACIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacies (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username                VARCHAR(80) UNIQUE,
    email                   VARCHAR(150) UNIQUE NOT NULL,
    password_hash           TEXT NOT NULL,
    pharmacy_name           VARCHAR(200) NOT NULL,
    license_number          VARCHAR(80),
    address                 TEXT,
    latitude                NUMERIC(10,6),
    longitude               NUMERIC(10,6),
    phone                   VARCHAR(30),
    status                  VARCHAR(20) DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
    is_active               BOOLEAN DEFAULT TRUE,
    approved_at             TIMESTAMPTZ,
    last_login_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pharmacies_email  ON pharmacies (email);
CREATE INDEX IF NOT EXISTS idx_pharmacies_status ON pharmacies (status);

-- ------------------------------------------------------------
-- GLOBAL MEDICINE CATALOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicine_catalog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    generic_name    VARCHAR(200),
    strength        VARCHAR(60),
    form            VARCHAR(40),
    manufacturer    VARCHAR(150),
    is_special      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (name, strength)
);
CREATE INDEX IF NOT EXISTS idx_med_catalog_name ON medicine_catalog (LOWER(name));

-- ------------------------------------------------------------
-- PHARMACY INVENTORY
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pharmacy_medicines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id     UUID NOT NULL REFERENCES pharmacies (id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    generic_name    VARCHAR(200),
    category        VARCHAR(20) NOT NULL DEFAULT 'normal'
                    CHECK (category IN ('normal','special')),
    manufacturer    VARCHAR(150),
    strength        VARCHAR(60),
    form            VARCHAR(40),
    stock           INTEGER DEFAULT 0 CHECK (stock >= 0),
    price           NUMERIC(10,2),
    is_available    BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pharm_meds_pharmacy ON pharmacy_medicines (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharm_meds_name     ON pharmacy_medicines (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_pharm_meds_category ON pharmacy_medicines (category);

-- ------------------------------------------------------------
-- REPORTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    doctor_name         VARCHAR(200) NOT NULL,
    appointment_date    DATE NOT NULL,
    test_results        TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports (appointment_date DESC);

CREATE TABLE IF NOT EXISTS report_images (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id           UUID NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    file_path           TEXT NOT NULL,
    original_filename   TEXT,
    image_type          VARCHAR(20) NOT NULL
                        CHECK (image_type IN ('prescription','test')),
    sort_order          INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_report_images_report ON report_images (report_id);

-- ------------------------------------------------------------
-- APPOINTMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    doctor_id           UUID REFERENCES doctors (id) ON DELETE SET NULL,
    doctor_name         VARCHAR(200) NOT NULL,
    location            VARCHAR(250),
    appointment_date    DATE NOT NULL,
    appointment_time    VARCHAR(20),
    notes               TEXT,
    reason              TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'confirmed'
                        CHECK (status IN ('requested','confirmed','rejected','completed')),
    doctor_feedback     TEXT,
    proposed_time       VARCHAR(20),
    latitude            NUMERIC(10,6),
    longitude           NUMERIC(10,6),
    doctor_photo_url    TEXT,
    requested_at        TIMESTAMPTZ DEFAULT NOW(),
    responded_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_user   ON appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);

-- ------------------------------------------------------------
-- DOCTOR NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id       UUID NOT NULL REFERENCES doctors (id) ON DELETE CASCADE,
    appointment_id  UUID REFERENCES appointments (id) ON DELETE CASCADE,
    type            VARCHAR(40) NOT NULL,
    message         TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doc_notif_doctor ON doctor_notifications (doctor_id, is_read);

-- ------------------------------------------------------------
-- PATIENT SUMMARY TABLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_doctor_history (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    doctor_id               UUID REFERENCES doctors (id) ON DELETE SET NULL,
    doctor_name             VARCHAR(200) NOT NULL,
    degree                  VARCHAR(255),
    profession              VARCHAR(120),
    specialization          VARCHAR(120),
    last_worked_place       VARCHAR(200),
    visit_date              DATE,
    appointment_id          UUID REFERENCES appointments (id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pdh_user ON patient_doctor_history (user_id, visit_date DESC);

CREATE TABLE IF NOT EXISTS patient_prescriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    doctor_id       UUID REFERENCES doctors (id) ON DELETE SET NULL,
    doctor_name     VARCHAR(200) NOT NULL,
    medicine_name   VARCHAR(200) NOT NULL,
    dosage          VARCHAR(120),
    duration_days   INTEGER,
    notes           TEXT,
    prescribed_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pp_user ON patient_prescriptions (user_id, prescribed_at DESC);

-- ------------------------------------------------------------
-- DISPENSE RECORDS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispense_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id         UUID NOT NULL REFERENCES pharmacies (id) ON DELETE CASCADE,
    user_id             UUID REFERENCES users (id) ON DELETE SET NULL,
    mcard_id            VARCHAR(40) NOT NULL,
    prescription_id     UUID REFERENCES patient_prescriptions (id) ON DELETE SET NULL,
    original_medicine   VARCHAR(200),
    dispensed_medicine  VARCHAR(200),
    was_substituted     BOOLEAN DEFAULT FALSE,
    not_dispensed       BOOLEAN DEFAULT FALSE,
    feedback            TEXT,
    dispensed_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispense_pharmacy ON dispense_records (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_dispense_mcard    ON dispense_records (mcard_id);

-- ------------------------------------------------------------
-- HEALTH METRICS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    metric_type     VARCHAR(40) NOT NULL
                    CHECK (metric_type IN (
                        'blood_pressure_systolic',
                        'blood_pressure_diastolic',
                        'blood_sugar',
                        'weight',
                        'heart_rate',
                        'temperature',
                        'oxygen_saturation'
                    )),
    value           NUMERIC(10,2) NOT NULL,
    unit            VARCHAR(20),
    measured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user
    ON health_metrics (user_id, metric_type, measured_at DESC);

-- ------------------------------------------------------------
-- MEDICINES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    dosage_morning  INTEGER NOT NULL DEFAULT 0 CHECK (dosage_morning >= 0),
    dosage_noon     INTEGER NOT NULL DEFAULT 0 CHECK (dosage_noon    >= 0),
    dosage_night    INTEGER NOT NULL DEFAULT 0 CHECK (dosage_night   >= 0),
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_days   INTEGER NOT NULL CHECK (duration_days > 0),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medicines_user ON medicines (user_id, is_active);

CREATE TABLE IF NOT EXISTS medicine_intakes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id     UUID NOT NULL REFERENCES medicines (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    intake_date     DATE NOT NULL,
    slot            VARCHAR(10) NOT NULL CHECK (slot IN ('morning','noon','night')),
    taken_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_med_intakes_unique
    ON medicine_intakes (medicine_id, intake_date, slot);
CREATE INDEX IF NOT EXISTS idx_med_intakes_user_date
    ON medicine_intakes (user_id, intake_date DESC);

-- ------------------------------------------------------------
-- TRIGGERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admins_updated_at        ON admins;
DROP TRIGGER IF EXISTS trg_users_updated_at         ON users;
DROP TRIGGER IF EXISTS trg_doctors_updated_at       ON doctors;
DROP TRIGGER IF EXISTS trg_pharmacies_updated_at    ON pharmacies;
DROP TRIGGER IF EXISTS trg_pharm_meds_updated_at    ON pharmacy_medicines;
DROP TRIGGER IF EXISTS trg_reports_updated_at       ON reports;
DROP TRIGGER IF EXISTS trg_appointments_updated_at  ON appointments;
DROP TRIGGER IF EXISTS trg_medicines_updated_at     ON medicines;

CREATE TRIGGER trg_admins_updated_at       BEFORE UPDATE ON admins             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_doctors_updated_at      BEFORE UPDATE ON doctors            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pharmacies_updated_at   BEFORE UPDATE ON pharmacies         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pharm_meds_updated_at   BEFORE UPDATE ON pharmacy_medicines FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reports_updated_at      BEFORE UPDATE ON reports            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_medicines_updated_at    BEFORE UPDATE ON medicines          FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- SEED: starter medicine catalog
-- ------------------------------------------------------------
INSERT INTO medicine_catalog (name, generic_name, strength, form, is_special)
VALUES
  ('Napa',        'Paracetamol',  '500mg', 'tablet',    FALSE),
  ('Napa Extra',  'Paracetamol',  '665mg', 'tablet',    FALSE),
  ('Seclo',       'Omeprazole',   '20mg',  'capsule',   FALSE),
  ('Monas',       'Montelukast',  '10mg',  'tablet',    FALSE),
  ('Fexo',        'Fexofenadine', '120mg', 'tablet',    FALSE),
  ('Amlopin',     'Amlodipine',   '5mg',   'tablet',    FALSE),
  ('Metfo',       'Metformin',    '500mg', 'tablet',    FALSE),
  ('Insulin',     'Insulin',      '100IU', 'injection', TRUE),
  ('Herceptin',   'Trastuzumab',  '440mg', 'injection', TRUE),
  ('Keytruda',    'Pembrolizumab','100mg', 'injection', TRUE)
ON CONFLICT (name, strength) DO NOTHING;


-- Lab accounts (mirrors doctors/pharmacies pattern)
CREATE TABLE IF NOT EXISTS labs (
    id              SERIAL PRIMARY KEY,
    lab_name        VARCHAR(255) NOT NULL,
    license_number  VARCHAR(100),
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    address         TEXT,
    password_hash   VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(255),
    status          VARCHAR(20) DEFAULT 'pending',  -- pending | approved | rejected | disabled
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Lab test catalog (optional: per-lab test list)
CREATE TABLE IF NOT EXISTS lab_tests (
    id          SERIAL PRIMARY KEY,
    lab_id      INTEGER REFERENCES labs(id) ON DELETE CASCADE,
    test_name   VARCHAR(255) NOT NULL,
    category    VARCHAR(100),
    price       NUMERIC(10,2),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Lab results — the table the patient summary reads from
CREATE TABLE IF NOT EXISTS lab_results (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lab_id          INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    test_name       VARCHAR(255) NOT NULL,
    test_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    result_value    TEXT,           -- e.g. "12.5", "Positive", or long text
    unit            VARCHAR(50),    -- mg/dL, g/dL, etc.
    reference_range VARCHAR(100),   -- "70-100"
    status          VARCHAR(20) DEFAULT 'normal',  -- normal | high | low | abnormal | critical
    notes           TEXT,
    report_file     VARCHAR(255),   -- optional uploaded PDF/image path
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_lab     ON lab_results(lab_id);