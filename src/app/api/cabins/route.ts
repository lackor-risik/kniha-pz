import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, handleApiError } from '@/lib/rbac';

export async function GET() {
    try {
        await requireAuth();

        const cabins = await prisma.cabin.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(cabins);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();

        const body = await request.json();
        const { name, description } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Názov chaty je povinný' }, { status: 400 });
        }

        const existing = await prisma.cabin.findUnique({ where: { name } });
        if (existing) {
            return NextResponse.json(
                { error: 'Chata s týmto názvom už existuje' },
                { status: 409 }
            );
        }

        const cabin = await prisma.cabin.create({
            data: { name, description },
        });

        return NextResponse.json(cabin, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
