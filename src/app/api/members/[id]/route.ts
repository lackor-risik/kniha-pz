import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, notFound } from '@/lib/rbac';
import { validateRequest, memberUpdateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const member = await prisma.member.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                role: true,
                isActive: true,
                googleSub: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        visits: true,
                        announcements: true,
                        cabinBookings: true,
                    },
                },
            },
        });

        if (!member) {
            return notFound('Člen nebol nájdený');
        }

        return NextResponse.json(member);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const body = await request.json();
        const validation = validateRequest(memberUpdateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Check if member exists
        const existing = await prisma.member.findUnique({ where: { id } });
        if (!existing) {
            return notFound('Člen nebol nájdený');
        }

        // Check email uniqueness if changing
        if (validation.data.email && validation.data.email !== existing.email) {
            const emailExists = await prisma.member.findFirst({
                where: {
                    email: { equals: validation.data.email, mode: 'insensitive' },
                    id: { not: id },
                },
            });

            if (emailExists) {
                return NextResponse.json(
                    { error: 'Člen s týmto emailom už existuje' },
                    { status: 409 }
                );
            }
        }

        const member = await prisma.member.update({
            where: { id },
            data: validation.data,
        });

        return NextResponse.json(member);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) {
            return notFound('Člen nebol nájdený');
        }

        // Soft delete - just deactivate
        await prisma.member.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
