import {
  savePushSubscriptionD1,
  deletePushSubscriptionD1,
  deletePushSubscriptionByEndpointD1,
  getSubscriptionsByUserIdsD1,
  getPushSubscriptionStatusD1,
  PushSubscriptionRecord
} from '../lib/d1PushSubscriptionRepository';
import { getLocalD1Database } from '../lib/sqlite-d1';
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
 * Helper to resolve D1 database instance from context env or local SQLite instance.
 */
export function resolveD1Database(db?: any, env?: any): any {
  if (db) return db;
  if (env?.DB) return env.DB;
  try {
    return getLocalD1Database();
  } catch (err) {
    console.warn('[WebPush] Could not resolve D1 database:', err);
    return null;
  }
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
 * Handles sending project comment push notifications:
 * 1. Verifies comment and project in Firestore.
 * 2. Determines exact recipients (Project Creator, PIC, Assignee, Members, Mentions, Parent Reply Author).
 * 3. Deduplicates recipients and removes sender.
 * 4. Queries Cloudflare D1 strictly for the target recipients.
 * 5. Sends categorized notifications (mention > reply > general).
 */
export async function sendProjectCommentPushNotification(
  payload: {
    projectId: string;
    commentId: string;
    authenticatedUserId?: string;
  },
  env: any = {},
  dbParam?: any
) {
  const { projectId, commentId, authenticatedUserId } = payload;

  if (!projectId || !commentId) {
    return { success: false, message: 'projectId and commentId are required' };
  }

  const db = resolveD1Database(dbParam, env);
  if (!db) {
    return { success: false, message: 'Cloudflare D1 database is not connected.' };
  }

  const vapidKeys = getVapidKeys(env);
  if (!vapidKeys) {
    return { success: false, message: 'Push notification service is not configured' };
  }

  try {
    // 1. Fetch the comment from Firestore
    const commentDoc = await firestoreRest.getDocument(
      `office_projects/${projectId}/comments`,
      commentId,
      env
    );

    if (!commentDoc) {
      return { success: false, message: `Comment ${commentId} not found in project ${projectId}` };
    }

    const senderUserId = commentDoc.userId || authenticatedUserId;
    if (!senderUserId) {
      return { success: false, message: 'Comment does not have a valid author userId' };
    }

    // Verify sender authentication if provided
    if (authenticatedUserId && commentDoc.userId && commentDoc.userId !== authenticatedUserId) {
      return { success: false, message: 'Authenticated user is not the author of this comment' };
    }

    const senderUserName = commentDoc.userName || 'Seseorang';
    const content = (commentDoc.content || '').trim();
    const previewText = content.length > 100 ? content.substring(0, 97) + '...' : content;
    const targetUrl = `/proyek/${projectId}?comment=${commentId}`;

    // 2. Fetch the project from Firestore
    const projectDoc = await firestoreRest.getDocument('office_projects', projectId, env);
    if (!projectDoc) {
      return { success: false, message: `Project ${projectId} not found` };
    }

    const projectTitle = projectDoc.title || 'Proyek';

    // 3. Extract candidate recipient user IDs from project structure
    const stakeholderUserIds = new Set<string>();

    const addUserId = (idCandidate: any) => {
      if (!idCandidate) return;
      if (typeof idCandidate === 'string' && idCandidate.trim()) {
        stakeholderUserIds.add(idCandidate.trim());
      } else if (typeof idCandidate === 'object') {
        const id = idCandidate.uid || idCandidate.userId || idCandidate.id;
        if (typeof id === 'string' && id.trim()) {
          stakeholderUserIds.add(id.trim());
        }
      }
    };

    // Owner / Creator
    addUserId(projectDoc.createdBy);
    addUserId(projectDoc.ownerId);
    if (projectDoc.metadata?.createdBy) addUserId(projectDoc.metadata.createdBy);

    // Assignee
    addUserId(projectDoc.assignedTo);

    // PIC
    addUserId(projectDoc.picId);
    if (projectDoc.pic && typeof projectDoc.pic === 'string' && projectDoc.pic.length > 15) {
      addUserId(projectDoc.pic);
    }
    if (projectDoc.metadata?.picId) addUserId(projectDoc.metadata.picId);

    // Members / Team
    if (Array.isArray(projectDoc.members)) {
      projectDoc.members.forEach(addUserId);
    }
    if (Array.isArray(projectDoc.team)) {
      projectDoc.team.forEach(addUserId);
    }
    if (Array.isArray(projectDoc.assignedUsers)) {
      projectDoc.assignedUsers.forEach(addUserId);
    }
    if (Array.isArray(projectDoc.metadata?.members)) {
      projectDoc.metadata.members.forEach(addUserId);
    }

    // Tasks assignees & creators
    if (Array.isArray(projectDoc.tasks)) {
      projectDoc.tasks.forEach((task: any) => {
        addUserId(task.assignedTo);
        addUserId(task.createdBy);
      });
    }

    // 4. Resolve Mentions
    const mentionUserIds = new Set<string>();
    const rawMentions: string[] = Array.isArray(commentDoc.mentions) ? commentDoc.mentions : [];

    for (const mention of rawMentions) {
      if (!mention) continue;
      const cleanMention = mention.replace(/^@/, '').trim().toLowerCase();

      // Check if it directly matches a stakeholder UID
      let matchedUid: string | null = null;
      for (const sUid of stakeholderUserIds) {
        if (sUid.toLowerCase() === cleanMention) {
          matchedUid = sUid;
          break;
        }
      }

      // Check if matches a member or task creator/assignee name in project
      if (!matchedUid && Array.isArray(projectDoc.tasks)) {
        for (const task of projectDoc.tasks) {
          if (task.assignedToName && task.assignedToName.toLowerCase().includes(cleanMention)) {
            matchedUid = task.assignedTo;
            break;
          }
          if (task.createdByName && task.createdByName.toLowerCase().includes(cleanMention)) {
            matchedUid = task.createdBy;
            break;
          }
        }
      }

      if (matchedUid && matchedUid !== senderUserId) {
        mentionUserIds.add(matchedUid);
      } else if (cleanMention.length > 10 && cleanMention !== senderUserId) {
        // If it looks like a Firebase UID, add directly
        mentionUserIds.add(cleanMention);
      }
    }

    // 5. Resolve Reply Parent Comment Author
    let replyParentAuthorUserId: string | null = null;
    if (commentDoc.parentCommentId) {
      try {
        const parentDoc = await firestoreRest.getDocument(
          `office_projects/${projectId}/comments`,
          commentDoc.parentCommentId,
          env
        );
        if (parentDoc?.userId && parentDoc.userId !== senderUserId) {
          replyParentAuthorUserId = parentDoc.userId;
        }
      } catch (parentErr) {
        console.warn('[WebPush] Could not fetch parent comment:', parentErr);
      }
    }

    // 6. Partition recipients by priority (Mention > Reply > General)
    const finalMentionUserIds: string[] = [];
    const finalReplyUserIds: string[] = [];
    const finalGeneralUserIds: string[] = [];

    // Priority 1: Mentioned users
    mentionUserIds.forEach((uid) => {
      if (uid && uid !== senderUserId) {
        finalMentionUserIds.push(uid);
      }
    });

    // Priority 2: Reply to parent comment author
    if (replyParentAuthorUserId && !finalMentionUserIds.includes(replyParentAuthorUserId)) {
      finalReplyUserIds.push(replyParentAuthorUserId);
    }

    // Priority 3: General project stakeholders
    stakeholderUserIds.forEach((uid) => {
      if (
        uid &&
        uid !== senderUserId &&
        !finalMentionUserIds.includes(uid) &&
        !finalReplyUserIds.includes(uid)
      ) {
        finalGeneralUserIds.push(uid);
      }
    });

    const allTargetUserIds = Array.from(
      new Set([...finalMentionUserIds, ...finalReplyUserIds, ...finalGeneralUserIds])
    );

    if (allTargetUserIds.length === 0) {
      return {
        success: true,
        message: 'No external stakeholders found to notify for this project comment.',
        dispatchedCount: 0,
        totalRecipients: 0
      };
    }

    // 7. Query Cloudflare D1 strictly for the target recipient user IDs
    const targetSubscriptions = await getSubscriptionsByUserIdsD1(db, allTargetUserIds);

    if (targetSubscriptions.length === 0) {
      return {
        success: true,
        message: 'No active push subscriptions registered in D1 for target project stakeholders.',
        dispatchedCount: 0,
        totalRecipients: allTargetUserIds.length
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

    return {
      success: true,
      dispatchedCount: totalDispatched,
      failedCount: totalFailed,
      totalRecipients: allTargetUserIds.length,
      subscriptionsCount: targetSubscriptions.length
    };
  } catch (err: any) {
    console.error('[WebPush D1] Error processing project comment push notification:', err);
    return { success: false, error: err.message || String(err) };
  }
}
