export interface PublicFormSubmissionRecord {
  id: string;
  referenceNo: string;
  status: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  entityType: string;
  serviceId: string;
  businessNameFirst: string;
  payload: any;
  documents: any[];
  driveFolderId: string;
  driveFolderUrl: string;
  createdAt: string;
}

export async function ensurePublicFormSubmissionsTable(db: any): Promise<void> {
  await db.prepare(`
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
    )
  `).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_public_form_submissions_created_at ON public_form_submissions(created_at);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_public_form_submissions_reference ON public_form_submissions(reference_no);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_public_form_submissions_entity ON public_form_submissions(entity_type);`).run();
}

function parseJson(value: unknown, fallback: any) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function mapPublicFormSubmission(row: any): PublicFormSubmissionRecord {
  return {
    id: String(row.id || ''),
    referenceNo: String(row.reference_no || ''),
    status: String(row.status || 'baru'),
    applicantName: String(row.applicant_name || ''),
    applicantEmail: String(row.applicant_email || ''),
    applicantPhone: String(row.applicant_phone || ''),
    entityType: String(row.entity_type || ''),
    serviceId: String(row.service_id || ''),
    businessNameFirst: String(row.business_name_first || ''),
    payload: parseJson(row.payload_json, {}),
    documents: parseJson(row.documents_json, []),
    driveFolderId: String(row.drive_folder_id || ''),
    driveFolderUrl: String(row.drive_folder_url || ''),
    createdAt: String(row.created_at || '')
  };
}

export async function insertPublicFormSubmission(db: any, row: {
  id: string;
  referenceNo: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  entityType: string;
  serviceId: string;
  businessNameFirst: string;
  payload: any;
  documents: any[];
  driveFolderId: string;
  driveFolderUrl: string;
  createdAt: string;
}): Promise<void> {
  await db.prepare(`
    INSERT INTO public_form_submissions (
      id, reference_no, status, applicant_name, applicant_email, applicant_phone,
      entity_type, service_id, business_name_first, payload_json, documents_json,
      drive_folder_id, drive_folder_url, created_at, updated_at
    ) VALUES (?, ?, 'baru', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    row.id,
    row.referenceNo,
    row.applicantName,
    row.applicantEmail,
    row.applicantPhone,
    row.entityType,
    row.serviceId,
    row.businessNameFirst,
    JSON.stringify(row.payload),
    JSON.stringify(row.documents),
    row.driveFolderId,
    row.driveFolderUrl,
    row.createdAt,
    row.createdAt
  ).run();
}

export async function listPublicFormSubmissions(db: any, options: { search?: string; limit?: number; offset?: number }) {
  const search = String(options.search || '').trim().slice(0, 120);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 50));
  const offset = Math.max(0, Number(options.offset) || 0);
  const where = search ? `WHERE reference_no LIKE ? OR applicant_name LIKE ? OR business_name_first LIKE ?` : '';
  const binds = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
  const totalRow = await db.prepare(`SELECT COUNT(*) AS total FROM public_form_submissions ${where}`).bind(...binds).first();
  const rows = await db.prepare(`
    SELECT * FROM public_form_submissions ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...binds, limit, offset).all();

  return {
    total: Number(totalRow?.total || 0),
    submissions: (rows.results || []).map(mapPublicFormSubmission)
  };
}
