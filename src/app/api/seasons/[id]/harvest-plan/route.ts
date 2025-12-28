import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, notFound, isAdmin } from '@/lib/rbac';
import { validateRequest, harvestPlanItemSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { id } = await params;

        const season = await prisma.huntingSeason.findUnique({
            where: { id },
            include: {
                harvestPlanItems: {
                    include: {
                        species: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!season) {
            return notFound('Sezóna nebola nájdená');
        }

        // Calculate taken counts from catches within season date range
        const catches = await prisma.catch.findMany({
            where: {
                huntedAt: {
                    gte: season.dateFrom,
                    lte: season.dateTo,
                },
            },
            select: {
                speciesId: true,
            },
        });

        // Aggregate by species (each catch = 1)
        const takenBySpecies: Record<string, number> = {};
        for (const c of catches) {
            takenBySpecies[c.speciesId] = (takenBySpecies[c.speciesId] || 0) + 1;
        }

        // Build report
        const report = season.harvestPlanItems.map((item) => {
            const taken = takenBySpecies[item.speciesId] || 0;
            const remaining = item.plannedCount - taken;
            const percentage = item.plannedCount > 0 ? Math.round((taken / item.plannedCount) * 100) : 0;
            const exceeded = taken >= item.plannedCount;

            return {
                id: item.id,
                species: item.species,
                plannedCount: item.plannedCount,
                takenCount: taken,
                remainingCount: remaining,
                percentage,
                exceeded,
                note: item.note,
            };
        });

        return NextResponse.json({
            season: {
                id: season.id,
                name: season.name,
                dateFrom: season.dateFrom,
                dateTo: season.dateTo,
                isActive: season.isActive,
            },
            harvestPlan: report,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const season = await prisma.huntingSeason.findUnique({ where: { id } });
        if (!season) {
            return notFound('Sezóna nebola nájdená');
        }

        const body = await request.json();
        const validation = validateRequest(harvestPlanItemSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { speciesId, plannedCount, note } = validation.data;

        // Check species exists
        const species = await prisma.species.findUnique({ where: { id: speciesId } });
        if (!species) {
            return NextResponse.json({ error: 'Druh zveri neexistuje' }, { status: 400 });
        }

        // Upsert harvest plan item
        const item = await prisma.harvestPlanItem.upsert({
            where: {
                seasonId_speciesId: {
                    seasonId: id,
                    speciesId,
                },
            },
            update: { plannedCount, note },
            create: {
                seasonId: id,
                speciesId,
                plannedCount,
                note,
            },
            include: {
                species: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
