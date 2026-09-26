import { WebinarParticipant, WebinarSettings, WebinarPublicInfo, WebinarStats, WebinarLeadStatus } from '../../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export const DEFAULT_WEBINAR_SETTINGS: WebinarSettings = {
  id: 'default',
  title: 'Pendaftaran & Absensi Webinar',
  subtitle: 'Silakan isi data berikut untuk konfirmasi kehadiran dan mendapatkan materi webinar.',
  eventTitle: 'Tata Kelola Perusahaan, RUPS & Kepatuhan Hukum Notaris',
  speaker: 'Nukantini Putri Parincha, SH. M.Kn',
  dateTime: 'Kamis, 24 Oktober 2025 | 13.30 - 15.30 WIB',
  description: 'Webinar komprehensif mengenai tata kelola perseroan terbatas, pelaksanaan RUPS/RUPST, pembaruan anggaran dasar, serta kepatuhan hukum kenotariatan.',
  materialUrl: 'https://drive.google.com',
  isActive: true,
  slug: 'default',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export function formatD1RowToParticipant(row: any): WebinarParticipant {
  if (!row) return null as any;

  let topics: string[] = [];
  if (row.topics) {
    try {
      topics = typeof row.topics === 'string' ? JSON.parse(row.topics) : row.topics;
    } catch {
      topics = String(row.topics).split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  return {
    id: String(row.id),
    webinarId: String(row.webinar_id || 'default'),
    name: String(row.name || ''),
    whatsapp: String(row.whatsapp || ''),
    email: row.email ? String(row.email) : undefined,
    company: row.company ? String(row.company) : undefined,
    position: row.position ? String(row.position) : undefined,
    city: row.city ? String(row.city) : undefined,
    attendance: String(row.attendance || 'Ya, mengikuti'),
    duration: row.duration ? String(row.duration) : undefined,
    companyNeed: row.company_need ? String(row.company_need) : undefined,
    topics,
    followUp: row.follow_up ? String(row.follow_up) : undefined,
    preferredContactTime: row.preferred_contact_time ? String(row.preferred_contact_time) : undefined,
    leadStatus: (row.lead_status as WebinarLeadStatus) || 'baru',
    notes: row.notes ? String(row.notes) : undefined,
    ipAddress: row.ip_address ? String(row.ip_address) : undefined,
    userAgent: row.user_agent ? String(row.user_agent) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString())
  };
}

export function formatD1RowToSettings(row: any): WebinarSettings {
  if (!row) return { ...DEFAULT_WEBINAR_SETTINGS };

  return {
    id: String(row.id || 'default'),
    title: String(row.title || DEFAULT_WEBINAR_SETTINGS.title),
    subtitle: String(row.subtitle || DEFAULT_WEBINAR_SETTINGS.subtitle),
    eventTitle: String(row.event_title || DEFAULT_WEBINAR_SETTINGS.eventTitle),
    speaker: String(row.speaker || DEFAULT_WEBINAR_SETTINGS.speaker),
    dateTime: String(row.date_time || DEFAULT_WEBINAR_SETTINGS.dateTime),
    description: String(row.description || DEFAULT_WEBINAR_SETTINGS.description),
    materialUrl: String(row.material_url || DEFAULT_WEBINAR_SETTINGS.materialUrl),
    isActive: row.is_active != null ? Boolean(row.is_active) : true,
    slug: String(row.slug || 'default'),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString())
  };
}

export async function ensureWebinarSettingsExist(db: any, slug = 'default'): Promise<WebinarSettings> {
  await ensureD1TablesExist(db);

  const existing = await db.prepare(
    `SELECT * FROM webinar_settings WHERE slug = ? OR id = ? LIMIT 1`
  ).bind(slug, slug).first();

  if (existing) {
    return formatD1RowToSettings(existing);
  }

  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO webinar_settings (
      id, title, subtitle, event_title, speaker, date_time, description, material_url, is_active, slug, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    slug,
    DEFAULT_WEBINAR_SETTINGS.title,
    DEFAULT_WEBINAR_SETTINGS.subtitle,
    DEFAULT_WEBINAR_SETTINGS.eventTitle,
    DEFAULT_WEBINAR_SETTINGS.speaker,
    DEFAULT_WEBINAR_SETTINGS.dateTime,
    DEFAULT_WEBINAR_SETTINGS.description,
    DEFAULT_WEBINAR_SETTINGS.materialUrl,
    DEFAULT_WEBINAR_SETTINGS.isActive ? 1 : 0,
    slug,
    now,
    now
  ).run();

  return {
    ...DEFAULT_WEBINAR_SETTINGS,
    id: slug,
    slug,
    createdAt: now,
    updatedAt: now
  };
}

export async function getWebinarSettingsD1(db: any, slug = 'default'): Promise<WebinarSettings> {
  return ensureWebinarSettingsExist(db, slug);
}

export async function getWebinarPublicInfoD1(db: any, slug = 'default'): Promise<{
  settings: WebinarPublicInfo;
  materialUrl?: string;
}> {
  const settings = await getWebinarSettingsD1(db, slug);
  return {
    settings: {
      title: settings.title,
      subtitle: settings.subtitle,
      eventTitle: settings.eventTitle,
      speaker: settings.speaker,
      dateTime: settings.dateTime,
      description: settings.description,
      isActive: settings.isActive,
      slug: settings.slug
    },
    materialUrl: settings.isActive ? settings.materialUrl : undefined
  };
}

export async function updateWebinarSettingsD1(db: any, settings: Partial<WebinarSettings>): Promise<WebinarSettings> {
  await ensureD1TablesExist(db);

  const current = await getWebinarSettingsD1(db, settings.slug || 'default');
  const now = new Date().toISOString();

  const updated: WebinarSettings = {
    ...current,
    ...settings,
    updatedAt: now
  };

  await db.prepare(`
    INSERT INTO webinar_settings (
      id, title, subtitle, event_title, speaker, date_time, description, material_url, is_active, slug, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      subtitle = excluded.subtitle,
      event_title = excluded.event_title,
      speaker = excluded.speaker,
      date_time = excluded.date_time,
      description = excluded.description,
      material_url = excluded.material_url,
      is_active = excluded.is_active,
      slug = excluded.slug,
      updated_at = excluded.updated_at
  `).bind(
    updated.id || 'default',
    updated.title,
    updated.subtitle || '',
    updated.eventTitle || '',
    updated.speaker || '',
    updated.dateTime || '',
    updated.description || '',
    updated.materialUrl || '',
    updated.isActive ? 1 : 0,
    updated.slug || 'default',
    updated.createdAt || now,
    now
  ).run();

  return updated;
}

export async function getAllWebinarParticipantsD1(
  db: any,
  options?: {
    webinarId?: string;
    search?: string;
    leadStatus?: string;
    attendance?: string;
    companyNeed?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ participants: WebinarParticipant[]; total: number }> {
  await ensureD1TablesExist(db);

  const conditions: string[] = [];
  const params: any[] = [];

  if (options?.webinarId && options.webinarId !== 'all') {
    conditions.push(`webinar_id = ?`);
    params.push(options.webinarId);
  }

  if (options?.leadStatus && options.leadStatus !== 'all') {
    conditions.push(`lead_status = ?`);
    params.push(options.leadStatus);
  }

  if (options?.attendance && options.attendance !== 'all') {
    conditions.push(`attendance = ?`);
    params.push(options.attendance);
  }

  if (options?.companyNeed && options.companyNeed !== 'all') {
    conditions.push(`company_need = ?`);
    params.push(options.companyNeed);
  }

  if (options?.search && options.search.trim()) {
    const s = `%${options.search.trim()}%`;
    conditions.push(`(name LIKE ? OR whatsapp LIKE ? OR email LIKE ? OR company LIKE ? OR city LIKE ?)`);
    params.push(s, s, s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await db.prepare(`SELECT count(*) as count FROM webinar_participants ${whereClause}`).bind(...params).first();
  const total = Number(countRow?.count || 0);

  let query = `SELECT * FROM webinar_participants ${whereClause} ORDER BY created_at DESC`;
  const queryParams = [...params];

  if (options?.limit) {
    query += ` LIMIT ?`;
    queryParams.push(options.limit);
    if (options.offset) {
      query += ` OFFSET ?`;
      queryParams.push(options.offset);
    }
  }

  const res = await db.prepare(query).bind(...queryParams).all();
  const participants = (res?.results || []).map((row: any) => formatD1RowToParticipant(row));

  return { participants, total };
}

export async function getWebinarParticipantByIdD1(db: any, id: string): Promise<WebinarParticipant | null> {
  await ensureD1TablesExist(db);

  const row = await db.prepare(`SELECT * FROM webinar_participants WHERE id = ? LIMIT 1`).bind(id).first();
  if (!row) return null;
  return formatD1RowToParticipant(row);
}

export async function createWebinarParticipantD1(
  db: any,
  data: Partial<WebinarParticipant>
): Promise<WebinarParticipant> {
  await ensureD1TablesExist(db);

  const id = data.id || `wp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const topicsJson = data.topics && Array.isArray(data.topics) ? JSON.stringify(data.topics) : '[]';

  const participant: WebinarParticipant = {
    id,
    webinarId: data.webinarId || 'default',
    name: (data.name || '').trim(),
    whatsapp: (data.whatsapp || '').replace(/[^0-9]/g, ''),
    email: data.email?.trim() || undefined,
    company: data.company?.trim() || undefined,
    position: data.position?.trim() || undefined,
    city: data.city?.trim() || undefined,
    attendance: data.attendance || 'Ya, mengikuti',
    duration: data.duration || undefined,
    companyNeed: data.companyNeed || undefined,
    topics: data.topics || [],
    followUp: data.followUp || undefined,
    preferredContactTime: data.preferredContactTime || undefined,
    leadStatus: data.leadStatus || 'baru',
    notes: data.notes || undefined,
    ipAddress: data.ipAddress || undefined,
    userAgent: data.userAgent || undefined,
    createdAt: now,
    updatedAt: now
  };

  await db.prepare(`
    INSERT INTO webinar_participants (
      id, webinar_id, name, whatsapp, email, company, position, city,
      attendance, duration, company_need, topics, follow_up, preferred_contact_time,
      lead_status, notes, ip_address, user_agent, created_at, updated_at, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    participant.id,
    participant.webinarId,
    participant.name,
    participant.whatsapp,
    participant.email || null,
    participant.company || null,
    participant.position || null,
    participant.city || null,
    participant.attendance,
    participant.duration || null,
    participant.companyNeed || null,
    topicsJson,
    participant.followUp || null,
    participant.preferredContactTime || null,
    participant.leadStatus,
    participant.notes || null,
    participant.ipAddress || null,
    participant.userAgent || null,
    now,
    now,
    JSON.stringify(participant)
  ).run();

  return participant;
}

export async function updateWebinarParticipantD1(
  db: any,
  id: string,
  data: Partial<WebinarParticipant>
): Promise<WebinarParticipant | null> {
  await ensureD1TablesExist(db);

  const existing = await getWebinarParticipantByIdD1(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: WebinarParticipant = {
    ...existing,
    ...data,
    updatedAt: now
  };

  const topicsJson = updated.topics && Array.isArray(updated.topics) ? JSON.stringify(updated.topics) : '[]';

  await db.prepare(`
    UPDATE webinar_participants SET
      lead_status = ?,
      notes = ?,
      name = ?,
      whatsapp = ?,
      email = ?,
      company = ?,
      position = ?,
      city = ?,
      attendance = ?,
      duration = ?,
      company_need = ?,
      topics = ?,
      follow_up = ?,
      preferred_contact_time = ?,
      updated_at = ?,
      raw_data = ?
    WHERE id = ?
  `).bind(
    updated.leadStatus,
    updated.notes || null,
    updated.name,
    updated.whatsapp,
    updated.email || null,
    updated.company || null,
    updated.position || null,
    updated.city || null,
    updated.attendance,
    updated.duration || null,
    updated.companyNeed || null,
    topicsJson,
    updated.followUp || null,
    updated.preferredContactTime || null,
    now,
    JSON.stringify(updated),
    id
  ).run();

  return updated;
}

export async function deleteWebinarParticipantD1(db: any, id: string): Promise<boolean> {
  await ensureD1TablesExist(db);
  const res = await db.prepare(`DELETE FROM webinar_participants WHERE id = ?`).bind(id).run();
  return Boolean(res?.meta?.changes && res.meta.changes > 0);
}

export async function getWebinarStatsD1(db: any, webinarId = 'default'): Promise<WebinarStats> {
  await ensureD1TablesExist(db);

  const res = await db.prepare(
    `SELECT * FROM webinar_participants WHERE webinar_id = ?`
  ).bind(webinarId).all();

  const rows = res?.results || [];

  const stats: WebinarStats = {
    total: rows.length,
    hadir: 0,
    tidakHadir: 0,
    leads: 0,
    dihubungi: 0,
    prospek: 0,
    klien: 0,
    tidakDilanjutkan: 0,
    byNeed: {},
    byTopic: {},
    byContactTime: {}
  };

  for (const row of rows) {
    // Attendance
    if (row.attendance === 'Ya, mengikuti' || row.attendance === 'Hadir' || String(row.attendance).toLowerCase().includes('ya')) {
      stats.hadir += 1;
    } else {
      stats.tidakHadir += 1;
    }

    // Lead status
    const status = row.lead_status || 'baru';
    if (status === 'baru') stats.leads += 1;
    else if (status === 'dihubungi') stats.dihubungi += 1;
    else if (status === 'follow_up') stats.dihubungi += 1;
    else if (status === 'prospek') stats.prospek += 1;
    else if (status === 'klien') stats.klien += 1;
    else if (status === 'tidak_dilanjutkan') stats.tidakDilanjutkan += 1;

    // Company Need
    if (row.company_need) {
      stats.byNeed[row.company_need] = (stats.byNeed[row.company_need] || 0) + 1;
    }

    // Topics
    if (row.topics) {
      try {
        const tops: string[] = typeof row.topics === 'string' ? JSON.parse(row.topics) : row.topics;
        for (const t of tops) {
          if (t && typeof t === 'string') {
            stats.byTopic[t] = (stats.byTopic[t] || 0) + 1;
          }
        }
      } catch {}
    }

    // Contact Time
    if (row.preferred_contact_time) {
      stats.byContactTime[row.preferred_contact_time] = (stats.byContactTime[row.preferred_contact_time] || 0) + 1;
    }
  }

  return stats;
}
