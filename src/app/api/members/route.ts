import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/rbac';
import { validateRequest, memberCreateSchema } from '@/lib/validation';

export async function GET() {
    try {
        await requireAdmin();

        const members = await prisma.member.findMany({
            orderBy: { displayName: 'asc' },
            select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                avatarData: true,
                role: true,
                isActive: true,
                googleSub: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
            },
        });

        return NextResponse.json(members);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();

        const body = await request.json();
        const validation = validateRequest(memberCreateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Check if email already exists
        const existing = await prisma.member.findFirst({
            where: {
                email: {
                    equals: validation.data.email,
                    mode: 'insensitive',
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Člen s týmto emailom už existuje' },
                { status: 409 }
            );
        }

        // Prepare data
        const { password, forcePasswordChange, ...memberData } = validation.data;

        // Hash password if provided
        let passwordHash: string | undefined;
        if (password && password.length >= 6) {
            passwordHash = await bcrypt.hash(password, 12);
        }

        const member = await prisma.member.create({
            data: {
                ...memberData,
                passwordHash,
                forcePasswordChange: passwordHash ? forcePasswordChange : false,
            },
        });

        // Mark all existing announcements as read for new member
        // so they don't see old announcements as unread
        const existingAnnouncements = await prisma.announcement.findMany({
            where: { deletedAt: null },
            select: { id: true }
        });

        if (existingAnnouncements.length > 0) {
            await prisma.announcementRead.createMany({
                data: existingAnnouncements.map(a => ({
                    announcementId: a.id,
                    memberId: member.id,
                })),
                skipDuplicates: true,
            });
        }

        return NextResponse.json(member, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
