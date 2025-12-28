import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, notFound } from '@/lib/rbac';
import { validateRequest, seasonUpdateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

// GET /api/seasons/[id] - Get single season
export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { id } = await params;

        const season = await prisma.huntingSeason.findUnique({
            where: { id },
        });

        if (!season) {
            return notFound('Sezóna nebola nájdená');
        }

        return NextResponse.json(season);
    } catch (error) {
        return handleApiError(error);
    }
}

// PUT /api/seasons/[id] - Update season
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const season = await prisma.huntingSeason.findUnique({ where: { id } });
        if (!season) {
            return notFound('Sezóna nebola nájdená');
        }

        const body = await request.json();
        const validation = validateRequest(seasonUpdateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { name, dateFrom, dateTo, isActive } = validation.data;

        // If setting this season as active, deactivate others
        if (isActive && !season.isActive) {
            await prisma.huntingSeason.updateMany({
                where: { isActive: true },
                data: { isActive: false },
            });
        }

        const updated = await prisma.huntingSeason.update({
            where: { id },
            data: {
                name,
                ...(dateFrom && { dateFrom: new Date(dateFrom) }),
                ...(dateTo && { dateTo: new Date(dateTo) }),
                isActive,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE /api/seasons/[id] - Delete season (admin only)
export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const season = await prisma.huntingSeason.findUnique({ where: { id } });
        if (!season) {
            return notFound('Sezóna nebola nájdená');
        }

        // Check if season has harvest plan items
        const itemCount = await prisma.harvestPlanItem.count({
            where: { seasonId: id },
        });

        if (itemCount > 0) {
            return NextResponse.json(
                { error: 'Nie je možné zmazať sezónu s položkami plánu lovu' },
                { status: 400 }
            );
        }

        await prisma.huntingSeason.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
