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

-- Indexes for performance tuning
CREATE INDEX IF NOT EXISTS idx_client_dir_company_name ON client_directory(company_name);
CREATE INDEX IF NOT EXISTS idx_client_dir_client_type ON client_directory(client_type);
CREATE INDEX IF NOT EXISTS idx_client_dir_is_archived ON client_directory(is_archived);
CREATE INDEX IF NOT EXISTS idx_client_dir_establishment_year ON client_directory(establishment_year);
