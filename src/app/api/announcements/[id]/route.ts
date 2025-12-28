import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, canAccessResource, forbidden, isAdmin } from '@/lib/rbac';
import { validateRequest, announcementUpdateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const announcement = await prisma.announcement.findFirst({
            where: { id, deletedAt: null },
            include: {
                author: {
                    select: { id: true, displayName: true, avatarUrl: true },
                },
                reads: {
                    where: { memberId: user.id },
                    select: { readAt: true },
                },
            },
        });

        if (!announcement) {
            return notFound('Oznam nebol nájdený');
        }

        return NextResponse.json({
            id: announcement.id,
            title: announcement.title,
            body: announcement.body,
            pinned: announcement.pinned,
            author: announcement.author,
            isRead: announcement.reads.length > 0,
            createdAt: announcement.createdAt,
            updatedAt: announcement.updatedAt,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const announcement = await prisma.announcement.findFirst({
            where: { id, deletedAt: null },
        });

        if (!announcement) {
            return notFound('Oznam nebol nájdený');
        }

        // Only author or admin can update
        if (!canAccessResource(user, announcement.authorId)) {
            return forbidden('Nemáte oprávnenie upravovať cudzí oznam');
        }

        const body = await request.json();
        const validation = validateRequest(announcementUpdateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { title, body: announcementBody, pinned } = validation.data;

        // Only admin can change pinned status
        const updateData: Record<string, unknown> = {};
        if (title) updateData.title = title;
        if (announcementBody) updateData.body = announcementBody;
        if (isAdmin(user) && pinned !== undefined) updateData.pinned = pinned;

        const updated = await prisma.announcement.update({
            where: { id },
            data: updateData,
            include: {
                author: { select: { id: true, displayName: true } },
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

        const announcement = await prisma.announcement.findFirst({
            where: { id, deletedAt: null },
        });

        if (!announcement) {
            return notFound('Oznam nebol nájdený');
        }

        // Only author or admin can delete
        if (!canAccessResource(user, announcement.authorId)) {
            return forbidden('Nemáte oprávnenie mazať cudzí oznam');
        }

        // Soft delete
        await prisma.announcement.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
