import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, notFound } from '@/lib/rbac';
import { validateRequest, speciesUpdateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const species = await prisma.species.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { catches: true },
                },
            },
        });

        if (!species) {
            return notFound('Druh zveri nebol nájdený');
        }

        return NextResponse.json(species);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const body = await request.json();
        const validation = validateRequest(speciesUpdateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const existing = await prisma.species.findUnique({ where: { id } });
        if (!existing) {
            return notFound('Druh zveri nebol nájdený');
        }

        // Check name uniqueness if changing
        if (validation.data.name && validation.data.name !== existing.name) {
            const nameExists = await prisma.species.findUnique({
                where: { name: validation.data.name },
            });

            if (nameExists) {
                return NextResponse.json(
                    { error: 'Druh zveri s týmto názvom už existuje' },
                    { status: 409 }
                );
            }
        }

        const species = await prisma.species.update({
            where: { id },
            data: validation.data,
        });

        return NextResponse.json(species);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const species = await prisma.species.findUnique({ where: { id } });
        if (!species) {
            return notFound('Druh zveri nebol nájdený');
        }

        // Soft delete
        await prisma.species.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
