import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, isAdmin } from '@/lib/rbac';
import { validateRequest, announcementCreateSchema } from '@/lib/validation';
import { notifyNewAnnouncement } from '@/lib/push';

export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const [announcements, total] = await Promise.all([
            prisma.announcement.findMany({
                where: { deletedAt: null },
                include: {
                    author: {
                        select: { id: true, displayName: true, avatarUrl: true },
                    },
                    reads: {
                        where: { memberId: user.id },
                        select: { readAt: true },
                    },
                },
                orderBy: [
                    { pinned: 'desc' },
                    { createdAt: 'desc' },
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.announcement.count({ where: { deletedAt: null } }),
        ]);

        const result = announcements.map((ann) => ({
            id: ann.id,
            title: ann.title,
            body: ann.body.length > 200 ? ann.body.substring(0, 200) + '...' : ann.body,
            pinned: ann.pinned,
            author: ann.author,
            isRead: ann.reads.length > 0,
            createdAt: ann.createdAt,
            updatedAt: ann.updatedAt,
        }));

        // Get unread count
        const unreadCount = await prisma.announcement.count({
            where: {
                deletedAt: null,
                reads: {
                    none: { memberId: user.id },
                },
            },
        });

        return NextResponse.json({
            data: result,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();

        const body = await request.json();
        const validation = validateRequest(announcementCreateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { title, body: announcementBody, pinned } = validation.data;

        // Only admin can pin
        const isPinned = isAdmin(user) ? pinned : false;

        const announcement = await prisma.announcement.create({
            data: {
                authorId: user.id,
                title,
                body: announcementBody,
                pinned: isPinned,
            },
            include: {
                author: { select: { id: true, displayName: true } },
            },
        });

        // Send push notifications to all members
        await notifyNewAnnouncement(announcement.id, title, user.id);

        return NextResponse.json(announcement, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
