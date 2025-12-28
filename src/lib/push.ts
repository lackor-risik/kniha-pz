import webpush from 'web-push';
import { prisma } from './prisma';

// Initialize web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export interface PushPayload {
    title: string;
    body?: string;
    announcementId?: string;
    url?: string;
}

/**
 * Get VAPID public key for client subscription
 */
export function getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
}

/**
 * Send push notification to a subscription
 */
export async function sendPushNotification(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: PushPayload
): Promise<boolean> {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                },
            },
            JSON.stringify(payload)
        );
        return true;
    } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;

        // Subscription expired or invalid
        if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.updateMany({
                where: { endpoint: subscription.endpoint },
                data: { isActive: false },
            });
        }

        console.error('Push notification failed:', error);
        return false;
    }
}

/**
 * Send push notification to all active members
 */
export async function sendPushToAllMembers(
    payload: PushPayload,
    excludeMemberId?: string
): Promise<{ sent: number; failed: number }> {
    const subscriptions = await prisma.pushSubscription.findMany({
        where: {
            isActive: true,
            ...(excludeMemberId && { memberId: { not: excludeMemberId } }),
        },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
        const success = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload
        );

        if (success) {
            sent++;
        } else {
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Notify all members about a new announcement
 */
export async function notifyNewAnnouncement(
    announcementId: string,
    title: string,
    authorId: string
): Promise<void> {
    const bodySnippet = title.length > 100 ? title.substring(0, 97) + '...' : title;

    await sendPushToAllMembers(
        {
            title: 'Nový oznam',
            body: bodySnippet,
            announcementId,
            url: `/announcements/${announcementId}`,
        },
        authorId // Don't notify the author
    );
}
