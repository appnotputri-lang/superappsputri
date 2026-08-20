import {
  savePushSubscriptionD1,
  deletePushSubscriptionD1,
  deletePushSubscriptionByEndpointD1,
  getSubscriptionsByUserIdsD1,
  getPushSubscriptionStatusD1,
  PushSubscriptionRecord
} from '../lib/d1PushSubscriptionRepository';
import { sendWebPushNotification } from '../lib/webPushWebCrypto';
import { firestoreRest } from '../lib/firestore-rest';

/**
 * Resolves VAPID keys strictly from environment variables (Cloudflare secrets / process.env).
 * Fallback key generation and hardcoded dummy keys are strictly prohibited.
 */
export function getVapidKeys(env: any = {}): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = env?.VAPID_PUBLIC_KEY || (typeof process !== 'undefined' ? process.env?.VAPID_PUBLIC_KEY : undefined);
  const privateKey = env?.VAPID_PRIVATE_KEY || (typeof process !== 'undefined' ? process.env?.VAPID_PRIVATE_KEY : undefined);
  const subject = env?.VAPID_SUBJECT || (typeof process !== 'undefined' ? process.env?.VAPID_SUBJECT : undefined);

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return {
    publicKey: publicKey.trim(),
    privateKey: privateKey.trim(),
    subject: subject.trim()
  };
}

/**
 * Helper to resolve D1 database instance from context env or passed db.
 */
export function resolveD1Database(db?: any, env?: any): any {
  if (db) return db;
  if (env?.DB) return env.DB;
  if (typeof process !== 'undefined' && (process as any)?.env?.DB) {
    return (process as any).env.DB;
  }
  return null;
}

/**
 * Saves a user's Web Push subscription to Cloudflare D1.
 */
export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  metadata: {
    platform?: string;
    userAgent?: string;
  } = {},
  env: any = {},
  dbParam?: any
) {
  const db = resolveD1Database(dbParam, env);
  if (!db) {
    throw new Error('Cloudflare D1 Database binding is not available');
  }

  return await savePushSubscriptionD1(db, {
    userId,
    subscription,
    platform: metadata.platform,
    userAgent: metadata.userAgent
  });
}

/**
 * Deletes a push subscription from Cloudflare D1.
 */
export async function deletePushSubscription(
  userId: string,
  endpoint: string,
  env: any = {},
  dbParam?: any
) {
  const db = resolveD1Database(dbParam, env);
  if (!db) {
    return { success: false, error: 'Cloudflare D1 Database binding is not available' };
  }

  return await deletePushSubscriptionD1(db, { userId, endpoint });
}

/**
 * Checks subscription status in Cloudflare D1.
 */
export async function getPushSubscriptionStatus(
  params: { userId?: string; endpoint?: string } = {},
  env: any = {},
  dbParam?: any
) {
  const db = resolveD1Database(dbParam, env);
  if (!db) {
    return { active: false, count: 0, subscriptions: [] };
  }

  return await getPushSubscriptionStatusD1(db, params);
}

/**
 * Retrieves push subscriptions from Cloudflare D1 for given user IDs.
 */
export async function getSubscriptionsForUsers(
  userIds: string[],
  env: any = {},
  dbParam?: any
): Promise<PushSubscriptionRecord[]> {
  const db = resolveD1Database(dbParam, env);
  if (!db) return [];

  return await getSubscriptionsByUserIdsD1(db, userIds);
}

/**
 * Dispatches Web Push notifications to subscriptions from Cloudflare D1 using Web Crypto.
 * Automatically deletes stale / expired subscriptions (HTTP 404/410) from D1.
 * Retains subscriptions on temporary errors (429/5xx).
 */
export async function dispatchPushToSubscriptions(
  subscriptions: PushSubscriptionRecord[],
  notificationData: {
    title: string;
    body: string;
    url: string;
    type?: 'mention' | 'reply' | 'general';
    projectId?: string;
    commentId?: string;
  },
  env: any = {},
  dbParam?: any
) {
  const vapidKeys = getVapidKeys(env);
  if (!vapidKeys) {
    throw new Error('Push notification service is not configured (missing VAPID credentials)');
  }

  const db = resolveD1Database(dbParam, env);

  const payloadString = JSON.stringify({
    title: notificationData.title,
    body: notificationData.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    url: notificationData.url,
    type: notificationData.type || 'general',
    projectId: notificationData.projectId || '',
    commentId: notificationData.commentId || '',
    data: {
      url: notificationData.url,
      type: notificationData.type || 'general',
      projectId: notificationData.projectId || '',
      commentId: notificationData.commentId || ''
    }
  });

  let successCount = 0;
  let failCount = 0;

  const promises = subscriptions.map(async (sub) => {
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return;
    }

    try {
      const result = await sendWebPushNotification({
        subscription: {
          endpoint: sub.endpoint,
          keys: sub.keys
        },
        payload: payloadString,
        vapid: vapidKeys,
        ttl: 86400,
        urgency: 'high'
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        // 404 Not Found or 410 Gone means the subscription is permanently expired/invalid
        if (result.isExpired) {
          console.log(`[WebPush D1] Subscription ${sub.endpoint} has expired (HTTP ${result.statusCode}), deleting from D1...`);
          if (db) {
            try {
              await deletePushSubscriptionByEndpointD1(db, sub.endpoint);
            } catch (cleanupErr) {
              console.warn('[WebPush D1] Failed cleaning up expired subscription:', cleanupErr);
            }
          }
        } else {
          // Temporary error (429, 500, 502, 503, 504) -> Log only, retain subscription
          console.warn(`[WebPush D1] Temporary push delivery issue for user ${sub.userId} (HTTP ${result.statusCode}):`, result.error);
        }
      }
    } catch (err: any) {
      failCount++;
      console.warn(`[WebPush D1] Error sending notification to user ${sub.userId}:`, err.message || err);
    }
  });

  await Promise.allSettled(promises);
  return { success: successCount, failed: failCount, total: subscriptions.length };
}

/**
 * Validates whether a candidate string is a valid Firebase Auth UID.
 * Rejects display names, emails, empty values, and system keywords.
 */
export function isValidFirebaseUid(candidate: any): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (trimmed.length < 5) return false;
  if (trimmed.includes('@') || trimmed.includes(' ') || trimmed.includes('/')) return false;
  const lower = trimmed.toLowerCase();
  if (['unassigned', 'system', 'admin', 'notaris', 'null', 'undefined', 'anonymous', 'someone', 'user'].includes(lower)) {
    return false;
  }
  return true;
}

/**
 * Handles sending project comment push notifications:
 * 1. Verifies comment and project in Firestore.
 * 2. Determines exact recipients (Project Creator, PIC, Assignee, Members, Mentions, Parent Reply Author).
 * 3. Deduplicates recipients and removes sender (unless debugNotifySelf is true).
 * 4. Queries Cloudflare D1 strictly for the target recipients.
 * 5. Sends categorized notifications (mention > reply > general).
 */
export async function sendProjectCommentPushNotification(
  payload: {
    projectId: string;
    commentId: string;
    authenticatedUserId?: string;
    userAuthToken?: string;
    debugNotifySelf?: boolean;
    fallbackData?: {
      projectTitle?: string;
      commentContent?: string;
      senderUserName?: string;
      mentions?: string[];
      parentCommentId?: string | null;
      stakeholderUserIds?: string[];
      participantUserIds?: string[];
    };
  },
  env: any = {},
  dbParam?: any
) {
  const { projectId, commentId, authenticatedUserId, userAuthToken, fallbackData, debugNotifySelf } = payload;
  const allowSelf = Boolean(debugNotifySelf);

  const authenticatedRecipientId =
    authenticatedUserId && isValidFirebaseUid(authenticatedUserId)
      ? authenticatedUserId
      : null;

  if (!projectId || !commentId) {
    return {
      success: false,
      debugNotifySelf: allowSelf,
      authenticatedUserId: authenticatedUserId || null,
      senderUserId: null,
      participantUserIds: [],
      recipientUserIds: [],
      subscriptionsCount: 0,
      dispatchedCount: 0,
      failedCount: 0,
      message: 'projectId and commentId are required'
    };
  }

  const db = resolveD1Database(dbParam, env);
  if (!db) {
    return {
      success: false,
      debugNotifySelf: allowSelf,
      authenticatedUserId: authenticatedUserId || null,
      senderUserId: null,
      participantUserIds: [],
      recipientUserIds: [],
      subscriptionsCount: 0,
      dispatchedCount: 0,
      failedCount: 0,
      message: 'Cloudflare D1 database is not connected.'
    };
  }

  const vapidKeys = getVapidKeys(env);
  if (!vapidKeys) {
    return {
      success: false,
      debugNotifySelf: allowSelf,
      authenticatedUserId: authenticatedUserId || null,
      senderUserId: null,
      participantUserIds: [],
      recipientUserIds: [],
      subscriptionsCount: 0,
      dispatchedCount: 0,
      failedCount: 0,
      message: 'Push notification service is not configured'
    };
  }

  try {
    let commentDoc: any = null;
    let projectDoc: any = null;

    // 1. Fetch comment from Firestore REST (with service account or bearer token)
    try {
      commentDoc = await firestoreRest.getDocument(
        `office_projects/${projectId}/comments`,
        commentId,
        env,
        userAuthToken
      );
    } catch (commErr: any) {
      console.warn(`[WebPush D1] Could not fetch comment from Firestore REST (${commErr.message}), checking fallback data...`);
    }

    // Fallback comment doc if REST failed
    if (!commentDoc && fallbackData) {
      commentDoc = {
        userId: authenticatedUserId,
        userName: fallbackData.senderUserName || 'Seseorang',
        content: fallbackData.commentContent || '',
        mentions: fallbackData.mentions || [],
        parentCommentId: fallbackData.parentCommentId || null
      };
    }

    if (!commentDoc) {
      return {
        success: false,
        debugNotifySelf: allowSelf,
        authenticatedUserId: authenticatedUserId || null,
        senderUserId: null,
        participantUserIds: [],
        recipientUserIds: [],
        subscriptionsCount: 0,
        dispatchedCount: 0,
        failedCount: 0,
        message: `Comment ${commentId} not found in project ${projectId}`
      };
    }

    const senderUserId =
      authenticatedRecipientId ||
      (commentDoc?.userId && isValidFirebaseUid(commentDoc.userId) ? commentDoc.userId : null) ||
      'system';

    const senderUserName = commentDoc.userName || fallbackData?.senderUserName || 'Seseorang';
    const content = (commentDoc.content || fallbackData?.commentContent || '').trim();
    const previewText = content.length > 100 ? content.substring(0, 97) + '...' : content;
    const targetUrl = `/proyek/${projectId}?comment=${commentId}`;

    // 2. Fetch project from Firestore REST
    try {
      projectDoc = await firestoreRest.getDocument('office_projects', projectId, env, userAuthToken);
    } catch (projErr: any) {
      console.warn(`[WebPush D1] Could not fetch project from Firestore REST (${projErr.message}), checking fallback data...`);
    }

    const projectTitle = projectDoc?.title || fallbackData?.projectTitle || 'Proyek';

    // 3. Extract candidate recipient user IDs from project structure
    const stakeholderUserIds = new Set<string>();

    const addValidUserId = (idCandidate: any) => {
      if (!idCandidate) return;
      if (typeof idCandidate === 'string' && isValidFirebaseUid(idCandidate)) {
        stakeholderUserIds.add(idCandidate.trim());
      } else if (typeof idCandidate === 'object') {
        const id = idCandidate.uid || idCandidate.userId || idCandidate.id;
        if (typeof id === 'string' && isValidFirebaseUid(id)) {
          stakeholderUserIds.add(id.trim());
        }
      }
    };

    if (projectDoc) {
      // 1. Explicit project participants
      if (Array.isArray(projectDoc.participantUserIds)) {
        projectDoc.participantUserIds.forEach(addValidUserId);
      }

      // 2. Owner / Creator
      addValidUserId(projectDoc.createdBy);
      addValidUserId(projectDoc.ownerId);
      if (projectDoc.metadata?.createdBy) addValidUserId(projectDoc.metadata.createdBy);

      // 3. Assignee
      addValidUserId(projectDoc.assignedToUid);
      addValidUserId(projectDoc.assignedToUserId);
      addValidUserId(projectDoc.assignedTo);

      // 4. PIC
      addValidUserId(projectDoc.picId);
      if (projectDoc.metadata?.picId) addValidUserId(projectDoc.metadata.picId);

      // 5. Members / Team / Assigned users
      if (Array.isArray(projectDoc.members)) projectDoc.members.forEach(addValidUserId);
      if (Array.isArray(projectDoc.team)) projectDoc.team.forEach(addValidUserId);
      if (Array.isArray(projectDoc.assignedUsers)) projectDoc.assignedUsers.forEach(addValidUserId);
      if (Array.isArray(projectDoc.metadata?.members)) projectDoc.metadata.members.forEach(addValidUserId);

      // 6. Tasks assignees & creators
      if (Array.isArray(projectDoc.tasks)) {
        projectDoc.tasks.forEach((task: any) => {
          addValidUserId(task.assignedTo);
          addValidUserId(task.createdBy);
        });
      }
    }

    // 7. Include fallback stakeholder & participant user IDs if provided
    if (Array.isArray(fallbackData?.participantUserIds)) {
      fallbackData.participantUserIds.forEach(addValidUserId);
    }
    if (Array.isArray(fallbackData?.stakeholderUserIds)) {
      fallbackData.stakeholderUserIds.forEach(addValidUserId);
    }

    // 4. Resolve Mentions
    const mentionUserIds = new Set<string>();
    const rawMentions: string[] = Array.isArray(commentDoc.mentions) ? commentDoc.mentions : [];

    for (const mention of rawMentions) {
      if (!mention) continue;
      const cleanMention = mention.replace(/^@/, '').trim().toLowerCase();

      let matchedUid: string | null = null;
      for (const sUid of stakeholderUserIds) {
        if (sUid.toLowerCase() === cleanMention) {
          matchedUid = sUid;
          break;
        }
      }

      if (!matchedUid && projectDoc && Array.isArray(projectDoc.tasks)) {
        for (const task of projectDoc.tasks) {
          if (task.assignedToName && task.assignedToName.toLowerCase().includes(cleanMention) && isValidFirebaseUid(task.assignedTo)) {
            matchedUid = task.assignedTo;
            break;
          }
          if (task.createdByName && task.createdByName.toLowerCase().includes(cleanMention) && isValidFirebaseUid(task.createdBy)) {
            matchedUid = task.createdBy;
            break;
          }
        }
      }

      if (matchedUid && (allowSelf || matchedUid !== senderUserId)) {
        mentionUserIds.add(matchedUid);
      } else if (isValidFirebaseUid(cleanMention) && (allowSelf || cleanMention !== senderUserId)) {
        mentionUserIds.add(cleanMention);
      }
    }

    // 5. Resolve Reply Parent Comment Author
    let replyParentAuthorUserId: string | null = null;
    const parentCommentId = commentDoc.parentCommentId || fallbackData?.parentCommentId;
    if (parentCommentId) {
      try {
        const parentDoc = await firestoreRest.getDocument(
          `office_projects/${projectId}/comments`,
          parentCommentId,
          env,
          userAuthToken
        );
        if (parentDoc?.userId && isValidFirebaseUid(parentDoc.userId)) {
          if (allowSelf || parentDoc.userId !== senderUserId) {
            replyParentAuthorUserId = parentDoc.userId;
          }
        }
      } catch (parentErr) {
        console.warn('[WebPush D1] Could not fetch parent comment:', parentErr);
      }
    }

    // 6. Partition recipients by priority (Mention > Reply > General)
    const finalMentionUserIds: string[] = [];
    const finalReplyUserIds: string[] = [];
    const finalGeneralUserIds: string[] = [];

    // Priority 1: Mentioned users
    mentionUserIds.forEach((uid) => {
      if (uid && (allowSelf || uid !== senderUserId)) {
        if (!finalMentionUserIds.includes(uid)) {
          finalMentionUserIds.push(uid);
        }
      }
    });

    // Priority 2: Reply to parent comment author
    if (replyParentAuthorUserId && (allowSelf || replyParentAuthorUserId !== senderUserId)) {
      if (!finalMentionUserIds.includes(replyParentAuthorUserId) && !finalReplyUserIds.includes(replyParentAuthorUserId)) {
        finalReplyUserIds.push(replyParentAuthorUserId);
      }
    }

    // Priority 3: General project stakeholders
    stakeholderUserIds.forEach((uid) => {
      if (
        uid &&
        (allowSelf || uid !== senderUserId) &&
        !finalMentionUserIds.includes(uid) &&
        !finalReplyUserIds.includes(uid)
      ) {
        if (!finalGeneralUserIds.includes(uid)) {
          finalGeneralUserIds.push(uid);
        }
      }
    });

    // Explicit self-test recipient injection when debugNotifySelf is true
    if (allowSelf && authenticatedRecipientId) {
      if (
        !finalMentionUserIds.includes(authenticatedRecipientId) &&
        !finalReplyUserIds.includes(authenticatedRecipientId) &&
        !finalGeneralUserIds.includes(authenticatedRecipientId)
      ) {
        finalGeneralUserIds.push(authenticatedRecipientId);
      }
    }

    const recipientSet = new Set([
      ...finalMentionUserIds,
      ...finalReplyUserIds,
      ...finalGeneralUserIds
    ]);

    if (allowSelf && authenticatedRecipientId) {
      recipientSet.add(authenticatedRecipientId);
      if (!finalGeneralUserIds.includes(authenticatedRecipientId)) {
        finalGeneralUserIds.push(authenticatedRecipientId);
      }
    }

    const allTargetUserIds = Array.from(recipientSet);

    // Mandated Debug Console Logs
    console.log('[Comment Push Debug] authenticatedUserId:', authenticatedUserId);
    console.log('[Comment Push Debug] senderUserId:', senderUserId);
    console.log('[Comment Push Debug] debugNotifySelf:', allowSelf);
    console.log('[Comment Push Debug] final recipients:', allTargetUserIds);

    if (allTargetUserIds.length === 0) {
      console.log('[Comment Push] No recipients found to notify.');
      return {
        success: true,
        debugNotifySelf: allowSelf,
        authenticatedUserId: authenticatedUserId || null,
        senderUserId: senderUserId || null,
        participantUserIds: Array.from(stakeholderUserIds),
        recipientUserIds: [],
        subscriptionsCount: 0,
        dispatchedCount: 0,
        failedCount: 0,
        message: 'No recipients found'
      };
    }

    // 7. Query Cloudflare D1 strictly for the target recipient user IDs
    const targetSubscriptions = await getSubscriptionsByUserIdsD1(db, allTargetUserIds);
    console.log(
      '[Comment Push] D1 subscriptions found:',
      targetSubscriptions.map(s => ({
        userId: s.userId,
        id: s.id,
        platform: s.platform
      }))
    );

    if (targetSubscriptions.length === 0) {
      return {
        success: true,
        debugNotifySelf: allowSelf,
        authenticatedUserId: authenticatedUserId || null,
        senderUserId: senderUserId || null,
        participantUserIds: Array.from(stakeholderUserIds),
        recipientUserIds: allTargetUserIds,
        subscriptionsCount: 0,
        dispatchedCount: 0,
        failedCount: 0,
        message: 'No active push subscriptions registered in D1 for target project stakeholders.'
      };
    }

    // 8. Group subscriptions by notification category
    const mentionSubs = targetSubscriptions.filter((s) => finalMentionUserIds.includes(s.userId));
    const replySubs = targetSubscriptions.filter((s) => finalReplyUserIds.includes(s.userId));
    const generalSubs = targetSubscriptions.filter((s) => finalGeneralUserIds.includes(s.userId));

    let totalDispatched = 0;
    let totalFailed = 0;

    // Dispatch Mentions
    if (mentionSubs.length > 0) {
      const res = await dispatchPushToSubscriptions(
        mentionSubs,
        {
          title: '🔔 Anda disebut dalam komentar',
          body: `${senderUserName} menyebut Anda di proyek ${projectTitle}`,
          url: targetUrl,
          type: 'mention',
          projectId,
          commentId
        },
        env,
        db
      );
      totalDispatched += res.success;
      totalFailed += res.failed;
    }

    // Dispatch Replies
    if (replySubs.length > 0) {
      const res = await dispatchPushToSubscriptions(
        replySubs,
        {
          title: `💬 ${senderUserName} membalas komentar Anda`,
          body: previewText ? `"${previewText}"` : `Membalas komentar Anda pada proyek ${projectTitle}.`,
          url: targetUrl,
          type: 'reply',
          projectId,
          commentId
        },
        env,
        db
      );
      totalDispatched += res.success;
      totalFailed += res.failed;
    }

    // Dispatch General Comments
    if (generalSubs.length > 0) {
      const res = await dispatchPushToSubscriptions(
        generalSubs,
        {
          title: '💬 Komentar baru',
          body: `${senderUserName} mengomentari proyek ${projectTitle}${previewText ? `\n"${previewText}"` : ''}`,
          url: targetUrl,
          type: 'general',
          projectId,
          commentId
        },
        env,
        db
      );
      totalDispatched += res.success;
      totalFailed += res.failed;
    }

    console.log(`[WebPush D1] ✅ Dispatch finished: ${totalDispatched} successful, ${totalFailed} failed.`);

    return {
      success: totalDispatched > 0,
      debugNotifySelf: allowSelf,
      authenticatedUserId: authenticatedUserId || null,
      senderUserId: senderUserId || null,
      participantUserIds: Array.from(stakeholderUserIds),
      recipientUserIds: allTargetUserIds,
      subscriptionsCount: targetSubscriptions.length,
      dispatchedCount: totalDispatched,
      failedCount: totalFailed,
      message: totalDispatched > 0
        ? `Successfully dispatched push notification to ${totalDispatched} device(s)`
        : (totalFailed > 0 ? `Failed to deliver push notification to ${totalFailed} subscription(s)` : 'No notifications dispatched')
    };
  } catch (err: any) {
    console.error('[WebPush D1] Error processing project comment push notification:', err);
    return {
      success: false,
      debugNotifySelf: allowSelf,
      authenticatedUserId: authenticatedUserId || null,
      senderUserId: null,
      participantUserIds: [],
      recipientUserIds: [],
      subscriptionsCount: 0,
      dispatchedCount: 0,
      failedCount: 0,
      error: err.message || String(err),
      message: err.message || 'Error processing push notification'
    };
  }
}

/**
 * Sends a test Web Push notification to the authenticated user's registered devices in D1.
 */
export async function sendTestPushNotification(
  params: {
    userId: string;
    userName?: string;
  },
  env: any = {},
  dbParam?: any
): Promise<{
  success: boolean;
  message: string;
  subscriptionsFound: number;
  dispatched: number;
  failed: number;
  error?: string;
}> {
  const { userId, userName } = params;
  if (!userId) {
    return {
      success: false,
      message: 'User ID tidak valid untuk uji coba notifikasi.',
      subscriptionsFound: 0,
      dispatched: 0,
      failed: 0
    };
  }

  const db = resolveD1Database(dbParam, env);
  if (!db) {
    return {
      success: false,
      message: 'Cloudflare D1 database tidak terhubung.',
      subscriptionsFound: 0,
      dispatched: 0,
      failed: 0
    };
  }

  const vapidKeys = getVapidKeys(env);
  if (!vapidKeys) {
    return {
      success: false,
      message: 'Push notification service is not configured (missing VAPID credentials)',
      subscriptionsFound: 0,
      dispatched: 0,
      failed: 0
    };
  }

  console.log(`[WebPush D1 Test] Looking up subscriptions in D1 for user UID: ${userId}`);
  const subscriptions = await getSubscriptionsByUserIdsD1(db, [userId]);

  if (subscriptions.length === 0) {
    console.warn(`[WebPush D1 Test] No active subscription in D1 for user UID: ${userId}`);
    return {
      success: false,
      message: 'Tidak ada langganan push notification yang terdaftar di Cloudflare D1 untuk akun ini. Pastikan Anda sudah mengaktifkan tombol notifikasi terlebih dahulu.',
      subscriptionsFound: 0,
      dispatched: 0,
      failed: 0
    };
  }

  console.log(`[WebPush D1 Test] Found ${subscriptions.length} active subscription(s) in D1 for user ${userId}. Sending test notification...`);

  const serverTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const res = await dispatchPushToSubscriptions(
    subscriptions,
    {
      title: '🔔 Uji Coba Web Push Berhasil!',
      body: `Halo ${userName || 'Pengguna'}, sistem Web Push Notification Notaris Putri terhubung dengan sempurna (${serverTimeStr}).`,
      url: '/',
      type: 'general'
    },
    env,
    db
  );

  console.log(`[WebPush D1 Test] Test dispatch result for user ${userId}: ${res.success} dispatched, ${res.failed} failed out of ${subscriptions.length} device(s).`);

  return {
    success: res.success > 0,
    message: res.success > 0
      ? `Notifikasi uji coba berhasil dikirim ke ${res.success} perangkat Anda!`
      : `Gagal mengirim notifikasi uji coba ke perangkat. Pastikan izin notifikasi diizinkan pada browser Anda.`,
    subscriptionsFound: subscriptions.length,
    dispatched: res.success,
    failed: res.failed
  };
}
