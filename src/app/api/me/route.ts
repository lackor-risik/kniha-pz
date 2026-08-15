import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ user: null });
        }

        // Get member from database to check password status
        const member = await prisma.member.findUnique({
            where: { id: session.user.id },
            select: { passwordHash: true, forcePasswordChange: true, avatarUrl: true, avatarData: true }
        });

        return NextResponse.json({
            user: session.user,
            hasPassword: !!member?.passwordHash,
            forcePasswordChange: member?.forcePasswordChange ?? false,
            avatarUrl: member?.avatarData || member?.avatarUrl || null
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Interná chyba servera' }, { status: 500 });
    }
}
