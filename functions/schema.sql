-- Schema for client_directory in Cloudflare D1
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

-- Indexes for client_directory
CREATE INDEX IF NOT EXISTS idx_client_dir_company_name ON client_directory(company_name);
CREATE INDEX IF NOT EXISTS idx_client_dir_client_type ON client_directory(client_type);
CREATE INDEX IF NOT EXISTS idx_client_dir_is_archived ON client_directory(is_archived);
CREATE INDEX IF NOT EXISTS idx_client_dir_establishment_year ON client_directory(establishment_year);

-- ==========================================
-- INVOICES TABLE SCHEMA (Cloudflare D1)
-- ==========================================
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

-- ==========================================
-- QUOTATIONS TABLE SCHEMA (Cloudflare D1)
-- ==========================================
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

-- ==========================================
-- PRODUCTS TABLE SCHEMA (Cloudflare D1)
-- ==========================================
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

-- ==========================================
-- GENERAL DOCUMENTS TABLE SCHEMA (Cloudflare D1)
-- ==========================================
CREATE TABLE IF NOT EXISTS general_documents (
  id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL,
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

-- ==========================================
-- GENERAL DOCUMENTS TABLE SCHEMA (Cloudflare D1)
-- ==========================================
CREATE TABLE IF NOT EXISTS general_documents (
  id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL,
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

