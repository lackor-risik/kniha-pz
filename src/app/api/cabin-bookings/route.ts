import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, conflict, badRequest, canAccessResource, forbidden, isAdmin } from '@/lib/rbac';
import { validateRequest, cabinBookingCreateSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
    try {
        await requireAuth();
        const { searchParams } = new URL(request.url);

        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const cabinId = searchParams.get('cabinId');

        const where: Record<string, unknown> = {
            status: 'CONFIRMED',
        };

        if (cabinId) {
            where.cabinId = cabinId;
        }

        if (from && to) {
            where.AND = [
                { startAt: { lte: new Date(to) } },
                { endAt: { gte: new Date(from) } },
            ];
        }

        const bookings = await prisma.cabinBooking.findMany({
            where,
            include: {
                cabin: { select: { id: true, name: true } },
                member: { select: { id: true, displayName: true, avatarUrl: true } },
            },
            orderBy: { startAt: 'asc' },
        });

        return NextResponse.json(bookings);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();

        const body = await request.json();
        const validation = validateRequest(cabinBookingCreateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { cabinId, startAt, endAt, title, note } = validation.data;
        const start = new Date(startAt);
        const end = new Date(endAt);

        // Validate dates - allow same day (end >= start)
        if (end < start) {
            return badRequest('Dátum konca nemôže byť pred dátumom začiatku');
        }

        // Check cabin exists
        const cabin = await prisma.cabin.findUnique({ where: { id: cabinId } });
        if (!cabin || !cabin.isActive) {
            return badRequest('Chata neexistuje alebo nie je aktívna');
        }

        // Check for conflicts
        const conflictingBooking = await prisma.cabinBooking.findFirst({
            where: {
                cabinId,
                status: 'CONFIRMED',
                AND: [
                    { startAt: { lt: end } },
                    { endAt: { gt: start } },
                ],
            },
            include: {
                member: { select: { displayName: true } },
            },
        });

        if (conflictingBooking) {
            return conflict(
                `Chata je v zvolenom čase už rezervovaná (${conflictingBooking.member.displayName})`
            );
        }

        const booking = await prisma.cabinBooking.create({
            data: {
                cabinId,
                memberId: user.id,
                startAt: start,
                endAt: end,
                title,
                note,
                status: 'CONFIRMED',
            },
            include: {
                cabin: { select: { id: true, name: true } },
                member: { select: { id: true, displayName: true } },
            },
        });

        return NextResponse.json(booking, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
