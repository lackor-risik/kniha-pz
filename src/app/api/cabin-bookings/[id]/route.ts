import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, canAccessResource, forbidden, isAdmin, conflict, badRequest } from '@/lib/rbac';
import { validateRequest, cabinBookingUpdateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { id } = await params;

        const booking = await prisma.cabinBooking.findUnique({
            where: { id },
            include: {
                cabin: true,
                member: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });

        if (!booking) {
            return notFound('Rezervácia nebola nájdená');
        }

        return NextResponse.json(booking);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const booking = await prisma.cabinBooking.findUnique({ where: { id } });
        if (!booking) {
            return notFound('Rezervácia nebola nájdená');
        }

        // Check ownership or admin
        if (!canAccessResource(user, booking.memberId)) {
            return forbidden('Nemáte oprávnenie upravovať cudziu rezerváciu');
        }

        if (booking.status === 'CANCELLED') {
            return badRequest('Zrušenú rezerváciu nie je možné upravovať');
        }

        const body = await request.json();
        const validation = validateRequest(cabinBookingUpdateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { startAt, endAt, title, note } = validation.data;
        const start = startAt ? new Date(startAt) : booking.startAt;
        const end = endAt ? new Date(endAt) : booking.endAt;

        if (end <= start) {
            return badRequest('Dátum konca musí byť po dátume začiatku');
        }

        // Check for conflicts (excluding this booking)
        if (startAt || endAt) {
            const conflictingBooking = await prisma.cabinBooking.findFirst({
                where: {
                    cabinId: booking.cabinId,
                    status: 'CONFIRMED',
                    id: { not: id },
                    AND: [
                        { startAt: { lt: end } },
                        { endAt: { gt: start } },
                    ],
                },
            });

            if (conflictingBooking) {
                return conflict('Chata je v zvolenom čase už rezervovaná');
            }
        }

        const updated = await prisma.cabinBooking.update({
            where: { id },
            data: {
                startAt: start,
                endAt: end,
                title,
                note,
            },
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

export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const booking = await prisma.cabinBooking.findUnique({ where: { id } });
        if (!booking) {
            return notFound('Rezervácia nebola nájdená');
        }

        // Check ownership or admin
        if (!canAccessResource(user, booking.memberId)) {
            return forbidden('Nemáte oprávnenie odstrániť cudziu rezerváciu');
        }

        await prisma.cabinBooking.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
