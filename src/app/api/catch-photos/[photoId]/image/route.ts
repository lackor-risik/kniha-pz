import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, canAccessResource, forbidden, isAdmin } from '@/lib/rbac';
import { getFile, deleteFile, getThumbnailKey } from '@/lib/storage';

type Params = { params: Promise<{ photoId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { photoId } = await params;
        const { searchParams } = new URL(request.url);
        const useThumbnail = searchParams.get('thumb') === '1';

        const photo = await prisma.catchPhoto.findUnique({
            where: { id: photoId },
        });

        if (!photo) {
            return notFound('Fotka nebola nájdená');
        }

        // Try to get thumbnail first if requested
        let fileBuffer: Buffer | null = null;
        let contentType = photo.mimeType;

        if (useThumbnail) {
            const thumbnailKey = getThumbnailKey(photo.storageKey);
            fileBuffer = await getFile(thumbnailKey);
            if (fileBuffer) {
                contentType = 'image/jpeg'; // Thumbnails are always JPEG
            }
        }

        // Fallback to original if no thumbnail or not requested
        if (!fileBuffer) {
            fileBuffer = await getFile(photo.storageKey);
        }

        if (!fileBuffer) {
            return notFound('Súbor nebol nájdený');
        }

        return new Response(new Uint8Array(fileBuffer), {
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileBuffer.length.toString(),
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

        // Delete from storage (both original and thumbnail)
        await deleteFile(photo.storageKey);
        await deleteFile(getThumbnailKey(photo.storageKey));

        // Delete from database
        await prisma.catchPhoto.delete({ where: { id: photoId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
