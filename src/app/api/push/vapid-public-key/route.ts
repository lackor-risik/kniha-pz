import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push';
import { requireAuth, handleApiError } from '@/lib/rbac';

export async function GET() {
    try {
        await requireAuth();

        const publicKey = getVapidPublicKey();

        if (!publicKey) {
            return NextResponse.json(
                { error: 'Push notifikácie nie sú nakonfigurované' },
                { status: 503 }
            );
        }

        return NextResponse.json({ publicKey });
    } catch (error) {
        return handleApiError(error);
    }
}
