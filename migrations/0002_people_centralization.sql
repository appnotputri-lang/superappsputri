-- ============================================================================
-- MIGRATION: 0002_people_centralization.sql
-- TARGET: Cloudflare D1 Database (notaris-putri-db)
-- DESKRIPSI: Sentralisasi Master Data Orang, Dokumen Identitas, Relasi Perusahaan, dan Karantina Konflik
-- ============================================================================

-- 1. TABEL MASTER DATA ORANG (people)
CREATE TABLE IF NOT EXISTS people (
  person_id TEXT PRIMARY KEY,
  nik TEXT,
  identity_status TEXT NOT NULL DEFAULT 'PROVISIONAL',
  nationality_type TEXT NOT NULL DEFAULT 'WNI',
  nationality TEXT DEFAULT 'INDONESIA',
  salutation TEXT,
  name TEXT NOT NULL,
  birth_city TEXT,
  birth_date TEXT,
  occupation TEXT,
  full_address TEXT,
  rt TEXT,
  rw TEXT,
  kelurahan TEXT,
  kecamatan TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  npwp TEXT,
  raw_data TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indeks Keunikan NIK Parsial: Hanya memeriksa keunikan untuk NIK yang terisi dan valid (WNI)
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_nik ON people(nik) WHERE nik IS NOT NULL AND nik != '';
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_nationality_type ON people(nationality_type);
CREATE INDEX IF NOT EXISTS idx_people_identity_status ON people(identity_status);
CREATE INDEX IF NOT EXISTS idx_people_created_at ON people(created_at);

-- 2. TABEL DOKUMEN IDENTITAS & RIWAYAT PASPOR WNA (person_identity_documents)
CREATE TABLE IF NOT EXISTS person_identity_documents (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(person_id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  doc_number TEXT NOT NULL,
  issuing_country TEXT DEFAULT 'IDN',
  issue_date TEXT,
  expiry_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  verified_status TEXT NOT NULL DEFAULT 'PROVISIONAL',
  verified_by_uid TEXT,
  verified_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_person_id ON person_identity_documents(person_id);
CREATE INDEX IF NOT EXISTS idx_docs_number ON person_identity_documents(doc_number);
-- Satu individu hanya boleh memiliki 1 dokumen aktif per jenis dokumen
CREATE UNIQUE INDEX IF NOT EXISTS idx_docs_active_person_type ON person_identity_documents(person_id, doc_type) WHERE is_active = 1;
-- KEBIJAKAN UNIK GLOBAL: Satu nomor paspor aktif hanya boleh terhubung dengan 1 person_id di seluruh sistem
CREATE UNIQUE INDEX IF NOT EXISTS idx_docs_active_passport_unique ON person_identity_documents(doc_type, doc_number) WHERE is_active = 1 AND doc_type = 'PASSPORT';

-- 3. TABEL RELASI ORANG - PERUSAHAAN (company_person_roles)
CREATE TABLE IF NOT EXISTS company_person_roles (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(person_id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  client_type TEXT,
  company_name TEXT NOT NULL,
  role_category TEXT NOT NULL,
  position_title TEXT,
  source_record_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roles_person_id ON company_person_roles(person_id);
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON company_person_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_roles_composite ON company_person_roles(company_id, person_id);

-- 4. TABEL LOG KARANTINA KONFLIK IDENTITAS (people_migration_conflicts)
CREATE TABLE IF NOT EXISTS people_migration_conflicts (
  conflict_id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL,
  doc_number TEXT,
  conflict_type TEXT NOT NULL,
  existing_person_id TEXT,
  incoming_payload TEXT NOT NULL,
  incoming_source TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'PENDING',
  resolved_by_uid TEXT,
  resolved_by_role TEXT,
  resolution_notes TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_conflicts_status ON people_migration_conflicts(resolution_status);
CREATE INDEX IF NOT EXISTS idx_conflicts_doc_number ON people_migration_conflicts(doc_number);
