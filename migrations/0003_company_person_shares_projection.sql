-- ============================================================================
-- MIGRATION: 0003_company_person_shares_projection.sql
-- TARGET: Cloudflare D1 Database (notaris-putri-db)
-- DESKRIPSI: Menambahkan kolom proyeksi kepemilikan saham dan status relasi ke company_person_roles
-- ============================================================================

ALTER TABLE company_person_roles ADD COLUMN share_count REAL;
ALTER TABLE company_person_roles ADD COLUMN share_value REAL;
ALTER TABLE company_person_roles ADD COLUMN ownership_percentage REAL;
ALTER TABLE company_person_roles ADD COLUMN relation_status TEXT DEFAULT 'ACTIVE';
ALTER TABLE company_person_roles ADD COLUMN last_synced_at TEXT;
ALTER TABLE company_person_roles ADD COLUMN sync_status TEXT DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_roles_sync_status ON company_person_roles(sync_status);
CREATE INDEX IF NOT EXISTS idx_roles_relation_status ON company_person_roles(relation_status);
