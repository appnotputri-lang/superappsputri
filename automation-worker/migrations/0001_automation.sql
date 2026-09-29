-- ============================================================
-- MIGRATION: 0001_automation.sql
-- TABEL OTOMASI & CRON LOGS UNTUK SUPERAPPS PUTRI
-- ============================================================

-- 1. TABEL ATURAN OTOMASI (automation_rules)
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  schedule TEXT,
  timezone TEXT DEFAULT 'Asia/Jakarta',
  recipient TEXT,
  template TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_run_at TEXT,
  last_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_type ON automation_rules(type);

-- 2. TABEL LOG EKSEKUSI OTOMASI (automation_logs)
CREATE TABLE IF NOT EXISTS automation_logs (
  id TEXT PRIMARY KEY,
  automation_id TEXT NOT NULL,
  run_key TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  recipient TEXT,
  message TEXT,
  provider TEXT,
  provider_response TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation_id ON automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_key ON automation_logs(run_key);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_started_at ON automation_logs(started_at);

-- 3. SEED ATURAN OTOMASI PERTAMA: project-report-daily
INSERT OR IGNORE INTO automation_rules (
  id,
  name,
  type,
  enabled,
  schedule,
  timezone,
  recipient,
  template,
  created_at,
  updated_at
) VALUES (
  'project-report-daily',
  'Laporan Proyek Harian',
  'PROJECT_REPORT',
  1,
  '0 1 * * *',
  'Asia/Jakarta',
  NULL,
  'DEFAULT_PROJECT_REPORT',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
