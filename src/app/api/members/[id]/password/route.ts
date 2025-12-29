import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, notFound } from '@/lib/rbac';

type Params = { params: Promise<{ id: string }> };

const setPasswordSchema = z.object({
    password: z.string().min(6, 'Heslo musí mať aspoň 6 znakov'),
    forcePasswordChange: z.boolean().optional().default(false),
});

// Admin can set password for any member
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const body = await request.json();
        const parsed = setPasswordSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        // Check if member exists
        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) {
            return notFound('Člen nebol nájdený');
        }

        // Hash and save password
        const passwordHash = await bcrypt.hash(parsed.data.password, 12);

        await prisma.member.update({
            where: { id },
            data: {
                passwordHash,
                forcePasswordChange: parsed.data.forcePasswordChange,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}

// Admin can remove password for any member
export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        // Check if member exists
        const member = await prisma.member.findUnique({ where: { id } });
        if (!member) {
            return notFound('Člen nebol nájdený');
        }

        await prisma.member.update({
            where: { id },
            data: { passwordHash: null },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
