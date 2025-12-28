import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, canAccessResource, forbidden, badRequest } from '@/lib/rbac';
import { validateRequest, visitEndSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const visit = await prisma.visit.findUnique({ where: { id } });
        if (!visit) {
            return notFound('Návšteva nebola nájdená');
        }

        // Check ownership or admin
        if (!canAccessResource(user, visit.memberId)) {
            return forbidden('Nemáte oprávnenie ukončiť cudziu návštevu');
        }

        if (visit.endDate !== null) {
            return badRequest('Návšteva je už ukončená');
        }

        const body = await request.json();
        const validation = validateRequest(visitEndSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const endDate = new Date(validation.data.endDate);

        // Validate end_date >= start_date
        if (endDate < visit.startDate) {
            return badRequest('Dátum ukončenia nemôže byť pred dátumom začiatku');
        }

        // Check if any catches are outside the visit range
        const invalidCatches = await prisma.catch.findMany({
            where: {
                visitId: id,
                huntedAt: { gt: endDate },
            },
        });

        if (invalidCatches.length > 0) {
            return badRequest(
                `Nie je možné ukončiť návštevu - existujú úlovky s časom lovu po ${endDate.toISOString()}`
            );
        }

        const updated = await prisma.visit.update({
            where: { id },
            data: { endDate },
            include: {
                member: { select: { id: true, displayName: true } },
                locality: { select: { id: true, name: true } },
                catches: {
                    include: {
                        species: { select: { id: true, name: true } },
                        huntingLocality: { select: { id: true, name: true } },
                        _count: { select: { photos: true } },
                    },
                    orderBy: { huntedAt: 'desc' },
                },
            },
        });

        // Add computed fields to match Visit interface
        const response = {
            ...updated,
            isOpen: updated.endDate === null,
            catchCount: updated.catches.length,
        };

        return NextResponse.json(response);
    } catch (error) {
        return handleApiError(error);
    }
}
