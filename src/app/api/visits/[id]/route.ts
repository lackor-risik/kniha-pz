import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, isAdmin, canAccessResource, forbidden } from '@/lib/rbac';
import { validateRequest, visitUpdateSchema, adminVisitUpdateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { id } = await params;

        const visit = await prisma.visit.findUnique({
            where: { id },
            include: {
                member: {
                    select: { id: true, displayName: true, avatarUrl: true },
                },
                locality: {
                    select: { id: true, name: true },
                },
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

        if (!visit) {
            return notFound('Návšteva nebola nájdená');
        }

        return NextResponse.json({
            ...visit,
            isOpen: visit.endDate === null,
            catchCount: visit.catches.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const visit = await prisma.visit.findUnique({ where: { id } });
        if (!visit) {
            return notFound('Návšteva nebola nájdená');
        }

        // Check ownership or admin
        if (!canAccessResource(user, visit.memberId)) {
            return forbidden('Nemáte oprávnenie upravovať cudziu návštevu');
        }

        // Non-admin cannot edit closed visits
        if (!isAdmin(user) && visit.endDate !== null) {
            return forbidden('Ukončenú návštevu nie je možné upravovať');
        }

        const body = await request.json();

        // Validate with appropriate schema
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let validatedData: any;

        if (isAdmin(user)) {
            const validation = validateRequest(adminVisitUpdateSchema, body);
            if (!validation.success) {
                return NextResponse.json({ error: validation.error }, { status: 400 });
            }
            validatedData = validation.data;
        } else {
            const validation = validateRequest(visitUpdateSchema, body);
            if (!validation.success) {
                return NextResponse.json({ error: validation.error }, { status: 400 });
            }
            validatedData = validation.data;
        }

        // Build update data
        const data: Record<string, unknown> = { ...validatedData };

        // Convert date strings to Date objects for admin
        if (isAdmin(user)) {
            if ('startDate' in data && data.startDate) {
                data.startDate = new Date(data.startDate as string);
            }
            if ('endDate' in data && data.endDate !== undefined) {
                data.endDate = data.endDate ? new Date(data.endDate as string) : null;
            }
        }

        const updated = await prisma.visit.update({
            where: { id },
            data,
            include: {
                member: { select: { id: true, displayName: true } },
                locality: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        if (!isAdmin(user)) {
            return forbidden('Len administrátor môže mazať návštevy');
        }

        const visit = await prisma.visit.findUnique({
            where: { id },
            include: { catches: { include: { photos: true } } },
        });
        if (!visit) {
            return notFound('Návšteva nebola nájdená');
        }

        // Delete in transaction: photos -> catches -> visit
        await prisma.$transaction(async (tx) => {
            // Delete all catch photos first
            const catchIds = visit.catches.map((c) => c.id);
            if (catchIds.length > 0) {
                await tx.catchPhoto.deleteMany({
                    where: { catchId: { in: catchIds } },
                });
                await tx.catch.deleteMany({
                    where: { visitId: id },
                });
            }
            // Delete the visit
            await tx.visit.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
