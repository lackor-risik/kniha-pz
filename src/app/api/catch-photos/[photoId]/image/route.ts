import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, canAccessResource, forbidden, isAdmin } from '@/lib/rbac';
import { getFile, deleteFile } from '@/lib/storage';

type Params = { params: Promise<{ photoId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { photoId } = await params;

        const photo = await prisma.catchPhoto.findUnique({
            where: { id: photoId },
        });

        if (!photo) {
            return notFound('Fotka nebola nájdená');
        }

        const fileBuffer = await getFile(photo.storageKey);

        if (!fileBuffer) {
            return notFound('Súbor nebol nájdený');
        }

        return new Response(new Uint8Array(fileBuffer), {
            headers: {
                'Content-Type': photo.mimeType,
                'Content-Length': photo.sizeBytes.toString(),
                'Cache-Control': 'private, max-age=31536000',
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { photoId } = await params;

        const photo = await prisma.catchPhoto.findUnique({
            where: { id: photoId },
            include: {
                catch: {
                    include: { visit: true },
                },
            },
        });

        if (!photo) {
            return notFound('Fotka nebola nájdená');
        }

        // Check ownership or admin
        if (!canAccessResource(user, photo.catch.visit.memberId)) {
            return forbidden('Nemáte oprávnenie mazať cudzie fotky');
        }

        // Non-admin cannot delete photos from catches in closed visits
        if (!isAdmin(user) && photo.catch.visit.endDate !== null) {
            return forbidden('Fotky z ukončenej návštevy nie je možné mazať');
        }

        // Delete from storage
        await deleteFile(photo.storageKey);

        // Delete from database
        await prisma.catchPhoto.delete({ where: { id: photoId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
