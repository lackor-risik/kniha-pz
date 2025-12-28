import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError, isAdmin } from '@/lib/rbac';
import { validateRequest, localityCreateSchema } from '@/lib/validation';

export async function GET() {
    try {
        await requireAuth();

        const localities = await prisma.locality.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        // Check which localities are currently occupied
        const occupiedLocalityIds = await prisma.visit.findMany({
            where: { endDate: null },
            select: { localityId: true },
        });

        const occupiedSet = new Set(occupiedLocalityIds.map((v) => v.localityId));

        const result = localities.map((loc) => ({
            ...loc,
            isOccupied: occupiedSet.has(loc.id),
        }));

        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();

        if (!isAdmin(user)) {
            return NextResponse.json(
                { error: 'Len administrátor môže vytvárať lokality' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = validateRequest(localityCreateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Check if name already exists
        const existing = await prisma.locality.findUnique({
            where: { name: validation.data.name },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Lokalita s týmto názvom už existuje' },
                { status: 409 }
            );
        }

        const locality = await prisma.locality.create({
            data: validation.data,
        });

        return NextResponse.json(locality, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
