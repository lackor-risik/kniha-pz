import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, notFound } from '@/lib/rbac';

type Params = { params: Promise<{ id: string }> };

// PUT /api/seasons/[id]/harvest-plan/reorder - Reorder harvest plan items
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id: seasonId } = await params;

        const season = await prisma.huntingSeason.findUnique({ where: { id: seasonId } });
        if (!season) {
            return notFound('Sezóna nebola nájdená');
        }

        const body = await request.json();
        const { items } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'Zoznam položiek je povinný' },
                { status: 400 }
            );
        }

        // Validate all items belong to this season
        const existingItems = await prisma.harvestPlanItem.findMany({
            where: { seasonId },
            select: { id: true },
        });
        const existingIds = new Set(existingItems.map((i) => i.id));

        for (const item of items) {
            if (!item.id || typeof item.sortOrder !== 'number') {
                return NextResponse.json(
                    { error: 'Každá položka musí mať id a sortOrder' },
                    { status: 400 }
                );
            }
            if (!existingIds.has(item.id)) {
                return NextResponse.json(
                    { error: `Položka ${item.id} nepatrí do tejto sezóny` },
                    { status: 400 }
                );
            }
        }

        // Update all sort orders in a transaction
        await prisma.$transaction(
            items.map((item: { id: string; sortOrder: number }) =>
                prisma.harvestPlanItem.update({
                    where: { id: item.id },
                    data: { sortOrder: item.sortOrder },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
