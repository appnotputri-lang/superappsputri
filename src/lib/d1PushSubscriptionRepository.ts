import { ensureD1TablesExist } from '../services/d1MigrationService';

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  platform: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

function formatRowToSubscription(row: any): PushSubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth
    },
    platform: row.platform || 'Web',
    userAgent: row.user_agent || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Saves or updates a Web Push subscription into Cloudflare D1.
 * Uses `endpoint` as UNIQUE key with UPSERT (ON CONFLICT DO UPDATE).
 */
export async function savePushSubscriptionD1(
  db: any,
  payload: {
    userId: string;
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    };
    platform?: string;
    userAgent?: string;
  }
): Promise<{ success: boolean; id: string; endpoint: string }> {
  if (!db) {
    throw new Error('Database connection (D1) is required');
  }

  const { userId, subscription, platform = 'Web', userAgent = '' } = payload;
  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Invalid push subscription payload: userId, endpoint, p256dh, and auth are required.');
  }

  await ensureD1TablesExist(db);

  const now = new Date().toISOString();
  const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const sql = `
    INSERT INTO push_subscriptions (
      id, user_id, endpoint, p256dh, auth, platform, user_agent, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      platform = excluded.platform,
      user_agent = excluded.user_agent,
      updated_at = excluded.updated_at;
  `;

  await db.prepare(sql).bind(
    id,
    userId,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    platform,
    userAgent,
    now,
    now
  ).run();

  return { success: true, id, endpoint: subscription.endpoint };
}

/**
 * Deletes a push subscription from Cloudflare D1 by endpoint (and optional userId).
 */
export async function deletePushSubscriptionD1(
  db: any,
  params: {
    userId?: string;
    endpoint: string;
  }
): Promise<{ success: boolean; deletedCount?: number }> {
  if (!db) {
    throw new Error('Database connection (D1) is required');
  }

  const { userId, endpoint } = params;
  if (!endpoint) {
    throw new Error('Endpoint is required to delete push subscription');
  }

  await ensureD1TablesExist(db);

  if (userId) {
    await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?`).bind(endpoint, userId).run();
  } else {
    await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(endpoint).run();
  }

  return { success: true };
}

/**
 * Deletes an expired or invalid push subscription by endpoint from D1.
 */
export async function deletePushSubscriptionByEndpointD1(db: any, endpoint: string): Promise<{ success: boolean }> {
  if (!db || !endpoint) return { success: false };
  try {
    await ensureD1TablesExist(db);
    await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(endpoint).run();
    return { success: true };
  } catch (err) {
    console.warn('[D1 Push Repository] Error deleting subscription by endpoint:', err);
    return { success: false };
  }
}

/**
 * Retrieves push subscriptions from Cloudflare D1 strictly for the specified user IDs.
 * Never returns all subscriptions if userIds is empty.
 */
export async function getSubscriptionsByUserIdsD1(
  db: any,
  userIds: string[] = []
): Promise<PushSubscriptionRecord[]> {
  if (!db) return [];

  const validIds = Array.from(new Set(userIds.filter(id => Boolean(id) && id !== '*')));
  if (validIds.length === 0) return [];

  await ensureD1TablesExist(db);

  const placeholders = validIds.map(() => '?').join(', ');
  const res = await db.prepare(
    `SELECT * FROM push_subscriptions WHERE user_id IN (${placeholders}) ORDER BY updated_at DESC`
  ).bind(...validIds).all();

  const rows = res?.results || [];
  return rows.map(formatRowToSubscription);
}

/**
 * Gets push subscription status for a user or endpoint.
 */
export async function getPushSubscriptionStatusD1(
  db: any,
  params: {
    userId?: string;
    endpoint?: string;
  } = {}
): Promise<{
  active: boolean;
  count: number;
  subscriptions: { id: string; platform: string; updatedAt: string }[];
}> {
  if (!db) {
    return { active: false, count: 0, subscriptions: [] };
  }

  await ensureD1TablesExist(db);

  const { userId, endpoint } = params;

  if (endpoint) {
    const row = await db.prepare(`SELECT * FROM push_subscriptions WHERE endpoint = ?`).bind(endpoint).first();
    if (row) {
      return {
        active: true,
        count: 1,
        subscriptions: [{ id: row.id, platform: row.platform || 'Web', updatedAt: row.updated_at }]
      };
    }
  }

  if (userId) {
    const res = await db.prepare(`SELECT id, platform, updated_at FROM push_subscriptions WHERE user_id = ?`).bind(userId).all();
    const rows = res?.results || [];
    return {
      active: rows.length > 0,
      count: rows.length,
      subscriptions: rows.map((r: any) => ({ id: r.id, platform: r.platform || 'Web', updatedAt: r.updated_at }))
    };
  }

  const res = await db.prepare(`SELECT count(*) as total FROM push_subscriptions`).first();
  const total = Number(res?.total || 0);

  return {
    active: total > 0,
    count: total,
    subscriptions: []
  };
}
