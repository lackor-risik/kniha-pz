import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, canAccessResource, forbidden, badRequest, isAdmin } from '@/lib/rbac';
import { saveFile, validateFile } from '@/lib/storage';

type Params = { params: Promise<{ id: string }> };

const MAX_PHOTOS_PER_CATCH = 3;

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { id } = await params;

        const catchRecord = await prisma.catch.findUnique({
            where: { id },
            select: { id: true },
        });

        if (!catchRecord) {
            return notFound('Úlovok nebol nájdený');
        }

        const photos = await prisma.catchPhoto.findMany({
            where: { catchId: id },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(photos);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const catchRecord = await prisma.catch.findUnique({
            where: { id },
            include: { visit: true },
        });

        if (!catchRecord) {
            return notFound('Úlovok nebol nájdený');
        }

        // Check ownership or admin
        if (!canAccessResource(user, catchRecord.visit.memberId)) {
            return forbidden('Nemáte oprávnenie pridávať fotky k cudziemu úlovku');
        }

        // Non-admin cannot add photos to catches in closed visits
        if (!isAdmin(user) && catchRecord.visit.endDate !== null) {
            return forbidden('K úlovkom v ukončenej návšteve nie je možné pridávať fotky');
        }

        // Check photo count limit
        const existingPhotoCount = await prisma.catchPhoto.count({
            where: { catchId: id },
        });

        if (existingPhotoCount >= MAX_PHOTOS_PER_CATCH) {
            return badRequest(`Maximálny počet fotiek na úlovok je ${MAX_PHOTOS_PER_CATCH}`);
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return badRequest('Súbor je povinný');
        }

        // Validate file
        const validation = validateFile(file.type, file.size);
        if (!validation.valid) {
            return badRequest(validation.error!);
        }

        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Save file to storage with thumbnail
        const storageResult = await saveFile(buffer, file.type, true);

        // Create photo record
        const photo = await prisma.catchPhoto.create({
            data: {
                catchId: id,
                storageKey: storageResult.key,
                mimeType: storageResult.mimeType,
                sizeBytes: storageResult.sizeBytes,
            },
        });

        return NextResponse.json(photo, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
