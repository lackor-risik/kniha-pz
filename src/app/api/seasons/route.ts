import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, isAdmin } from '@/lib/rbac';
import { validateRequest, seasonCreateSchema } from '@/lib/validation';

export async function GET() {
    try {
        await requireAuth();

        const seasons = await prisma.huntingSeason.findMany({
            orderBy: { dateFrom: 'desc' },
            include: {
                _count: {
                    select: { harvestPlanItems: true },
                },
            },
        });

        return NextResponse.json(seasons);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();

        const body = await request.json();
        const validation = validateRequest(seasonCreateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { name, dateFrom, dateTo, isActive } = validation.data;

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

        const season = await prisma.huntingSeason.create({
            data: {
                name,
                dateFrom: new Date(dateFrom),
                dateTo: new Date(dateTo),
                isActive,
            },
        });

        return NextResponse.json(season, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
