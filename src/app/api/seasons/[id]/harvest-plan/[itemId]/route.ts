import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, notFound } from '@/lib/rbac';

type Params = { params: Promise<{ id: string; itemId: string }> };

// DELETE /api/seasons/[id]/harvest-plan/[itemId] - Delete harvest plan item
export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id: seasonId, itemId } = await params;

        const item = await prisma.harvestPlanItem.findFirst({
            where: { id: itemId, seasonId },
        });

        if (!item) {
            return notFound('Položka plánu lovu nebola nájdená');
        }

        await prisma.harvestPlanItem.delete({ where: { id: itemId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
