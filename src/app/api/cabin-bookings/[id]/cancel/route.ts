import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, canAccessResource, forbidden, badRequest } from '@/lib/rbac';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const booking = await prisma.cabinBooking.findUnique({ where: { id } });
        if (!booking) {
            return notFound('Rezervácia nebola nájdená');
        }

        // Check ownership or admin
        if (!canAccessResource(user, booking.memberId)) {
            return forbidden('Nemáte oprávnenie zrušiť cudziu rezerváciu');
        }

        if (booking.status === 'CANCELLED') {
            return badRequest('Rezervácia je už zrušená');
        }

        const updated = await prisma.cabinBooking.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: {
                cabin: { select: { id: true, name: true } },
                member: { select: { id: true, displayName: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}
