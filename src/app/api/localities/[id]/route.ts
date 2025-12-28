import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, notFound } from '@/lib/rbac';
import { validateRequest, localityUpdateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const locality = await prisma.locality.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        visits: true,
                        huntingCatches: true,
                    },
                },
            },
        });

        if (!locality) {
            return notFound('Lokalita nebola nájdená');
        }

        // Check if currently occupied
        const activeVisit = await prisma.visit.findFirst({
            where: { localityId: id, endDate: null },
            include: { member: { select: { displayName: true } } },
        });

        return NextResponse.json({
            ...locality,
            isOccupied: !!activeVisit,
            occupiedBy: activeVisit?.member?.displayName || null,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const body = await request.json();
        const validation = validateRequest(localityUpdateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const existing = await prisma.locality.findUnique({ where: { id } });
        if (!existing) {
            return notFound('Lokalita nebola nájdená');
        }

        // Check name uniqueness if changing
        if (validation.data.name && validation.data.name !== existing.name) {
            const nameExists = await prisma.locality.findUnique({
                where: { name: validation.data.name },
            });

            if (nameExists) {
                return NextResponse.json(
                    { error: 'Lokalita s týmto názvom už existuje' },
                    { status: 409 }
                );
            }
        }

        const locality = await prisma.locality.update({
            where: { id },
            data: validation.data,
        });

        return NextResponse.json(locality);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const locality = await prisma.locality.findUnique({ where: { id } });
        if (!locality) {
            return notFound('Lokalita nebola nájdená');
        }

        // Soft delete
        await prisma.locality.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
