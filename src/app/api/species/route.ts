import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, isAdmin } from '@/lib/rbac';
import { validateRequest, speciesCreateSchema } from '@/lib/validation';

export async function GET() {
    try {
        await requireAuth();

        const species = await prisma.species.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(species);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();

        if (!isAdmin(user)) {
            return NextResponse.json(
                { error: 'Len administrátor môže vytvárať druhy zveri' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = validateRequest(speciesCreateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Check if name already exists
        const existing = await prisma.species.findUnique({
            where: { name: validation.data.name },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Druh zveri s týmto názvom už existuje' },
                { status: 409 }
            );
        }

        const species = await prisma.species.create({
            data: validation.data,
        });

        return NextResponse.json(species, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
