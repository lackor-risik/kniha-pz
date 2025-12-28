import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push';

export async function GET() {
    const vapidPublicKey = getVapidPublicKey();
    return NextResponse.json({ vapidPublicKey });
}
