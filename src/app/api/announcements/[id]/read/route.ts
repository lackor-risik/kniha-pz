import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound } from '@/lib/rbac';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const announcement = await prisma.announcement.findFirst({
            where: { id, deletedAt: null },
        });

        if (!announcement) {
            return notFound('Oznam nebol nájdený');
        }

        // Upsert read receipt (idempotent)
        await prisma.announcementRead.upsert({
            where: {
                announcementId_memberId: {
                    announcementId: id,
                    memberId: user.id,
                },
            },
            update: {}, // Already exists, do nothing
            create: {
                announcementId: id,
                memberId: user.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
