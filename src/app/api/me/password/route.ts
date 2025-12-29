import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const passwordSchema = z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'Heslo musí mať aspoň 6 znakov'),
});

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Neautorizovaný' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = passwordSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const { currentPassword, newPassword } = parsed.data;

        // Get current member
        const member = await prisma.member.findUnique({
            where: { id: session.user.id },
        });

        if (!member) {
            return NextResponse.json({ error: 'Používateľ nenájdený' }, { status: 404 });
        }

        // If member has a password, verify current password
        if (member.passwordHash) {
            if (!currentPassword) {
                return NextResponse.json(
                    { error: 'Aktuálne heslo je povinné' },
                    { status: 400 }
                );
            }

            const isValid = await bcrypt.compare(currentPassword, member.passwordHash);
            if (!isValid) {
                return NextResponse.json(
                    { error: 'Nesprávne aktuálne heslo' },
                    { status: 400 }
                );
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password and clear force change flag
        await prisma.member.update({
            where: { id: session.user.id },
            data: {
                passwordHash: hashedPassword,
                forcePasswordChange: false,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json(
            { error: 'Nastala chyba pri zmene hesla' },
            { status: 500 }
        );
    }
}
