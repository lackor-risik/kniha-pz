import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, badRequest } from '@/lib/rbac';
import { validateRequest, pushSubscribeSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();

        const body = await request.json();
        const validation = validateRequest(pushSubscribeSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { endpoint, keys, userAgent } = validation.data;

        // Upsert subscription by endpoint
        const subscription = await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                memberId: user.id,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userAgent,
                isActive: true,
                lastSeenAt: new Date(),
            },
            create: {
                memberId: user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userAgent,
                isActive: true,
            },
        });

        return NextResponse.json({ id: subscription.id, success: true }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
