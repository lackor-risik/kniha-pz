import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/rbac';

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();

        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint je povinný' }, { status: 400 });
        }

        // Deactivate subscription
        await prisma.pushSubscription.updateMany({
            where: {
                endpoint,
                memberId: user.id,
            },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
