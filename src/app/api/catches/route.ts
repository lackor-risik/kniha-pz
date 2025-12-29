import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/rbac';

export async function GET(request: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(request.url);
        const seasonId = searchParams.get('seasonId');

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

        // Get catches for the season date range
        const catches = await prisma.catch.findMany({
            where: {
                huntedAt: {
                    gte: season.dateFrom,
                    lte: season.dateTo,
                },
            },
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
