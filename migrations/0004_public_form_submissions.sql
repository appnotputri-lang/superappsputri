CREATE TABLE IF NOT EXISTS public_form_submissions (
  id TEXT PRIMARY KEY,
  reference_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'baru',
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  service_id TEXT NOT NULL,
  business_name_first TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  documents_json TEXT NOT NULL DEFAULT '[]',
  drive_folder_id TEXT NOT NULL,
  drive_folder_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_form_submissions_created_at
  ON public_form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_public_form_submissions_reference
  ON public_form_submissions(reference_no);
CREATE INDEX IF NOT EXISTS idx_public_form_submissions_entity
  ON public_form_submissions(entity_type);
