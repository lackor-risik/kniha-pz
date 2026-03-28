import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, notFound } from '@/lib/rbac';

type Params = { params: Promise<{ id: string }> };

// POST /api/seasons/[id]/copy - Copy harvest plan to a new or existing season
export async function POST(request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const body = await request.json();
        const { targetSeasonId, name, dateFrom, dateTo, isActive } = body;

        // Check source season exists and get its harvest plan items
        const sourceSeason = await prisma.huntingSeason.findUnique({
            where: { id },
            include: {
                harvestPlanItems: true,
            },
        });

        if (!sourceSeason) {
            return notFound('Zdrojová sezóna nebola nájdená');
        }

        if (sourceSeason.harvestPlanItems.length === 0) {
            return NextResponse.json(
                { error: 'Zdrojová sezóna nemá žiadne položky plánu lovu' },
                { status: 400 }
            );
        }

        // Copy to EXISTING season
        if (targetSeasonId) {
            if (targetSeasonId === id) {
                return NextResponse.json(
                    { error: 'Nemožno kopírovať do tej istej sezóny' },
                    { status: 400 }
                );
            }

            const targetSeason = await prisma.huntingSeason.findUnique({
                where: { id: targetSeasonId },
            });

            if (!targetSeason) {
                return notFound('Cieľová sezóna nebola nájdená');
            }

            // Upsert each harvest plan item into the target season
            await prisma.$transaction(async (tx) => {
                for (const item of sourceSeason.harvestPlanItems) {
                    await tx.harvestPlanItem.upsert({
                        where: {
                            seasonId_speciesId: {
                                seasonId: targetSeasonId,
                                speciesId: item.speciesId,
                            },
                        },
                        update: {
                            plannedCount: item.plannedCount,
                            note: item.note,
                        },
                        create: {
                            seasonId: targetSeasonId,
                            speciesId: item.speciesId,
                            plannedCount: item.plannedCount,
                            note: item.note,
                        },
                    });
                }
            });

            return NextResponse.json(targetSeason, { status: 200 });
        }

        // Copy to NEW season
        if (!name || !dateFrom || !dateTo) {
            return NextResponse.json(
                { error: 'Názov, dátum od a dátum do sú povinné' },
                { status: 400 }
            );
        }

        // Check name uniqueness
        const existing = await prisma.huntingSeason.findUnique({
            where: { name },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Sezóna s týmto názvom už existuje' },
                { status: 409 }
            );
        }

        // If setting as active, deactivate others
        if (isActive) {
            await prisma.huntingSeason.updateMany({
                data: { isActive: false },
            });
        }

        // Create new season with copied harvest plan items in a transaction
        const newSeason = await prisma.$transaction(async (tx) => {
            const season = await tx.huntingSeason.create({
                data: {
                    name,
                    dateFrom: new Date(dateFrom),
                    dateTo: new Date(dateTo),
                    isActive: isActive || false,
                },
            });

            await tx.harvestPlanItem.createMany({
                data: sourceSeason.harvestPlanItems.map((item) => ({
                    seasonId: season.id,
                    speciesId: item.speciesId,
                    plannedCount: item.plannedCount,
                    note: item.note,
                })),
            });

            return season;
        });

        return NextResponse.json(newSeason, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
