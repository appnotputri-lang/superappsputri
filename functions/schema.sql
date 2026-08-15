-- ==========================================
-- COMPLETE SCHEMA FOR CLOUDFLARE D1
-- ==========================================

-- 1. CLIENT DIRECTORY
CREATE TABLE IF NOT EXISTS client_directory (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  search_name TEXT,
  search_tokens TEXT,
  client_type TEXT,
  company_type TEXT,
  domicile TEXT,
  establishment_deed_date TEXT,
  establishment_year TEXT,
  updated_at TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  npwp TEXT,
  kbli_items TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_dir_company_name ON client_directory(company_name);
CREATE INDEX IF NOT EXISTS idx_client_dir_client_type ON client_directory(client_type);
CREATE INDEX IF NOT EXISTS idx_client_dir_is_archived ON client_directory(is_archived);
CREATE INDEX IF NOT EXISTS idx_client_dir_establishment_year ON client_directory(establishment_year);

-- 2. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  client_id TEXT,
  client_name TEXT NOT NULL,
  client_source TEXT DEFAULT 'local',
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  issue_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  items TEXT NOT NULL,           -- JSON array of InvoiceItem
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  tax_rate REAL,
  discount REAL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  balance_due REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  project_id TEXT,
  project_title TEXT,
  project_ids TEXT,             -- JSON array
  project_titles TEXT,          -- JSON array
  quotation_id TEXT,
  quotation_number TEXT,
  language TEXT DEFAULT 'id',
  notes TEXT,
  terms TEXT,
  bank_details TEXT,            -- JSON object
  payment_history TEXT,         -- JSON array
  public_token TEXT,
  legacy_public_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  raw_data TEXT                 -- Complete original JSON representation
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_name ON invoices(client_name);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON invoices(quotation_id);

-- 3. QUOTATIONS
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  quotation_number TEXT NOT NULL,
  date TEXT NOT NULL,
  valid_until TEXT,
  client_id TEXT,
  client_name TEXT NOT NULL,
  client_address TEXT,
  client_phone TEXT,
  client_email TEXT,
  client_source TEXT DEFAULT 'local',
  items TEXT NOT NULL,           -- JSON array of items
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  tax_rate REAL,
  discount REAL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  job_title TEXT,
  public_token TEXT,
  invoice_id TEXT,
  invoice_number TEXT,
  project_id TEXT,
  project_title TEXT,
  project_ids TEXT,             -- JSON array
  project_titles TEXT,          -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  raw_data TEXT                 -- Complete original JSON representation
);

CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client_name ON quotations(client_name);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(date);
CREATE INDEX IF NOT EXISTS idx_quotations_invoice_id ON quotations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON quotations(project_id);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  description TEXT,
  is_taxed INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  raw_data TEXT                 -- Complete original JSON representation
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 5. KBLI MAPPING RECORDS
CREATE TABLE IF NOT EXISTS kbli_mapping_records (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kelompok_usaha TEXT,
  selected_items TEXT NOT NULL, -- JSON array of KbliItem
  updated_at TEXT,
  user_id TEXT,
  created_at TEXT,
  raw_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_kbli_mapping_nama ON kbli_mapping_records(nama);
CREATE INDEX IF NOT EXISTS idx_kbli_mapping_updated_at ON kbli_mapping_records(updated_at);

-- 6. KBLI SUGGESTION RECORDS
CREATE TABLE IF NOT EXISTS kbli_suggestion_records (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kelompok_usaha TEXT,
  selected_items TEXT NOT NULL, -- JSON array of KbliItem
  updated_at TEXT,
  user_id TEXT,
  created_at TEXT,
  raw_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_kbli_suggestion_nama ON kbli_suggestion_records(nama);
CREATE INDEX IF NOT EXISTS idx_kbli_suggestion_updated_at ON kbli_suggestion_records(updated_at);

-- 7. GENERAL DOCUMENTS (Surat Jalan & Tanda Terima)
CREATE TABLE IF NOT EXISTS general_documents (
  id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL,        -- 'RECEIPT' or 'DELIVERY'
  reference_no TEXT,
  date TEXT,
  client_id TEXT,
  client_name TEXT,
  client_source TEXT,
  client_pic TEXT,
  client_address TEXT,
  client_contact TEXT,
  officer_name TEXT,
  destination TEXT,
  delivery_method TEXT,
  tracking_number TEXT,
  notes TEXT,
  items TEXT,                   -- JSON array of GeneralDocumentItem
  public_token TEXT,
  created_at TEXT,
  updated_at TEXT,
  raw_data TEXT                 -- Complete original JSON representation
);

CREATE INDEX IF NOT EXISTS idx_gen_docs_doc_type ON general_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_gen_docs_reference_no ON general_documents(reference_no);
CREATE INDEX IF NOT EXISTS idx_gen_docs_client_id ON general_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_gen_docs_date ON general_documents(date);
CREATE INDEX IF NOT EXISTS idx_gen_docs_public_token ON general_documents(public_token);
CREATE INDEX IF NOT EXISTS idx_gen_docs_created_at ON general_documents(created_at);

-- 8. DEEDS (Buku Daftar Akta Notaris)
CREATE TABLE IF NOT EXISTS deeds (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  number TEXT,
  date TEXT,
  title TEXT,
  category TEXT,
  client_id TEXT,
  client_name TEXT,
  job_name TEXT,
  pic_name TEXT,
  notes TEXT,
  appearers TEXT,               -- JSON array of DeedAppearer
  grantors TEXT,                -- JSON array of DeedGrantor
  created_at TEXT,
  updated_at TEXT,
  raw_data TEXT                 -- Complete original JSON representation
);

CREATE INDEX IF NOT EXISTS idx_deeds_date ON deeds(date);
CREATE INDEX IF NOT EXISTS idx_deeds_order_number ON deeds(order_number);
CREATE INDEX IF NOT EXISTS idx_deeds_number ON deeds(number);
CREATE INDEX IF NOT EXISTS idx_deeds_client_id ON deeds(client_id);
CREATE INDEX IF NOT EXISTS idx_deeds_created_at ON deeds(created_at);

-- 9. PRIVATE DEEDS (Buku Daftar Akta Di Bawah Tangan / Legalisasi & Waarmerking)
CREATE TABLE IF NOT EXISTS private_deeds (
  id TEXT PRIMARY KEY,
  number TEXT,
  registration_date TEXT,
  type TEXT,                    -- 'Legalisasi' or 'Waarmerking'
  description TEXT,
  parties TEXT,                 -- JSON array of party names
  pic_name TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  raw_data TEXT                 -- Complete original JSON representation
);

CREATE INDEX IF NOT EXISTS idx_private_deeds_reg_date ON private_deeds(registration_date);
CREATE INDEX IF NOT EXISTS idx_private_deeds_number ON private_deeds(number);
CREATE INDEX IF NOT EXISTS idx_private_deeds_type ON private_deeds(type);
CREATE INDEX IF NOT EXISTS idx_private_deeds_created_at ON private_deeds(created_at);

-- 10. INCOMING MAILS (Buku Surat Masuk)
CREATE TABLE IF NOT EXISTS incoming_mails (
  id TEXT PRIMARY KEY,
  date TEXT,
  mail_number TEXT,
  sender TEXT,
  subject TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  raw_data TEXT                 -- Complete original JSON representation
);

CREATE INDEX IF NOT EXISTS idx_incoming_mails_date ON incoming_mails(date);
CREATE INDEX IF NOT EXISTS idx_incoming_mails_mail_number ON incoming_mails(mail_number);
CREATE INDEX IF NOT EXISTS idx_incoming_mails_created_at ON incoming_mails(created_at);

-- 11. OUTGOING MAILS (Buku Surat Keluar)
CREATE TABLE IF NOT EXISTS outgoing_mails (
  id TEXT PRIMARY KEY,
  date TEXT,
  mail_number TEXT,
  recipient TEXT,
  subject TEXT,
  attachment_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  raw_data TEXT                 -- Complete original JSON representation
);

CREATE INDEX IF NOT EXISTS idx_outgoing_mails_date ON outgoing_mails(date);
CREATE INDEX IF NOT EXISTS idx_outgoing_mails_mail_number ON outgoing_mails(mail_number);
CREATE INDEX IF NOT EXISTS idx_outgoing_mails_created_at ON outgoing_mails(created_at);

-- 12. PROTEST CHEQUES (Buku Daftar Protes Wesel / Cek)
CREATE TABLE IF NOT EXISTS protest_cheques (
  id TEXT PRIMARY KEY,
  number TEXT,
  protest_date TEXT,
  bank_name TEXT,
  cheque_number TEXT,
  amount REAL DEFAULT 0,
  applicant_name TEXT,
  drawer_name TEXT,
  reason TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  raw_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_protest_cheques_date ON protest_cheques(protest_date);
CREATE INDEX IF NOT EXISTS idx_protest_cheques_number ON protest_cheques(number);

-- 13. DEPOSIT NOTES (Penitipan Uang)
CREATE TABLE IF NOT EXISTS deposit_notes (
  id TEXT PRIMARY KEY,
  deposit_number TEXT NOT NULL,
  date TEXT NOT NULL,
  client_id TEXT,
  client_name TEXT NOT NULL,
  client_address TEXT,
  recipient_name TEXT,
  payment_method TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  hide_qr INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  raw_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_deposit_notes_number ON deposit_notes(deposit_number);
CREATE INDEX IF NOT EXISTS idx_deposit_notes_client_id ON deposit_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_deposit_notes_date ON deposit_notes(date);

CREATE TABLE IF NOT EXISTS deposit_note_items (
  id TEXT PRIMARY KEY,
  deposit_note_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_deposit_note_items_dn_id ON deposit_note_items(deposit_note_id);
