import { NextResponse } from 'next/server';
import { getAuthUser, handleApiError } from '@/lib/rbac';

export async function GET() {
    try {
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ user: null });
        }

        return NextResponse.json({ user });
    } catch (error) {
        return handleApiError(error);
    }
}
