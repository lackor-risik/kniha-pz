import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/rbac';

export async function GET(request: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(request.url);
        const seasonId = searchParams.get('seasonId');
        const memberId = searchParams.get('memberId');

        if (!seasonId) {
            return NextResponse.json({ error: 'seasonId je povinný' }, { status: 400 });
        }

        // Get season date range
        const season = await prisma.huntingSeason.findUnique({
            where: { id: seasonId },
            select: { dateFrom: true, dateTo: true },
        });

        if (!season) {
            return NextResponse.json({ error: 'Sezóna neexistuje' }, { status: 404 });
        }

        // Build where clause
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = {
            huntedAt: {
                gte: season.dateFrom,
                lte: season.dateTo,
            },
        };

        // Filter by member if provided
        if (memberId) {
            whereClause.visit = { memberId };
        }

        // Get catches for the season date range
        const catches = await prisma.catch.findMany({
            where: whereClause,
            include: {
                species: { select: { id: true, name: true } },
                huntingLocality: { select: { id: true, name: true } },
                visit: {
                    select: {
                        id: true,
                        member: { select: { id: true, displayName: true } },
                    },
                },
                _count: {
                    select: { photos: true }
                }
            },
            orderBy: [
                { species: { name: 'asc' } },
                { huntedAt: 'desc' },
            ],
        });

        return NextResponse.json(catches);
    } catch (error) {
        return handleApiError(error);
    }
}
