import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, notFound, canAccessResource, forbidden, isAdmin, badRequest } from '@/lib/rbac';
import { validateRequest, catchUpdateSchema } from '@/lib/validation';
import { deleteFile, getThumbnailKey } from '@/lib/storage';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { id } = await params;

        const catchRecord = await prisma.catch.findUnique({
            where: { id },
            include: {
                species: true,
                huntingLocality: true,
                visit: {
                    include: {
                        member: { select: { id: true, displayName: true } },
                        locality: true,
                    },
                },
                photos: {
                    select: {
                        id: true,
                        storageKey: true,
                        mimeType: true,
                        sizeBytes: true,
                        width: true,
                        height: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!catchRecord) {
            return notFound('Úlovok nebol nájdený');
        }

        return NextResponse.json(catchRecord);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id } = await params;

        const catchRecord = await prisma.catch.findUnique({
            where: { id },
            include: {
                visit: true,
                species: true,
            },
        });

        if (!catchRecord) {
            return notFound('Úlovok nebol nájdený');
        }

        // Check ownership or admin
        if (!canAccessResource(user, catchRecord.visit.memberId)) {
            return forbidden('Nemáte oprávnenie upravovať cudzí úlovok');
        }

        // Non-admin cannot edit catches in closed visits
        if (!isAdmin(user) && catchRecord.visit.endDate !== null) {
            return forbidden('Úlovky v ukončenej návšteve nie je možné upravovať');
        }

        const body = await request.json();
        const validation = validateRequest(catchUpdateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const data = validation.data;

        // If species is changing, get the new species for validation
        const species = data.speciesId
            ? await prisma.species.findUnique({ where: { id: data.speciesId } })
            : catchRecord.species;

        if (data.speciesId && (!species || !species.isActive)) {
            return badRequest('Druh zveri neexistuje alebo nie je aktívny');
        }

        // Validate hunting locality if changing
        if (data.huntingLocalityId) {
            const locality = await prisma.locality.findUnique({
                where: { id: data.huntingLocalityId },
            });
            if (!locality || !locality.isActive) {
                return badRequest('Lokalita lovu neexistuje alebo nie je aktívna');
            }
        }

        // Validate hunted_at if changing
        if (data.huntedAt) {
            const huntedAt = new Date(data.huntedAt);
            if (huntedAt < catchRecord.visit.startDate) {
                return badRequest('Čas lovu nemôže byť pred začiatkom návštevy');
            }
            if (catchRecord.visit.endDate && huntedAt > catchRecord.visit.endDate) {
                return badRequest('Čas lovu nemôže byť po ukončení návštevy');
            }
        }

        // Validate shooter type
        if (data.shooterType === 'GUEST') {
            if (!catchRecord.visit.hasGuest) {
                return badRequest('Návšteva nemá hosťa');
            }
            const guestName = data.guestShooterName ?? catchRecord.guestShooterName;
            if (!guestName || guestName.trim() === '') {
                return badRequest('Meno hosťa je povinné');
            }
        }

        // Conditional field validations
        const effectiveSex = data.sex ?? catchRecord.sex;
        const effectiveAge = data.age ?? catchRecord.age;
        const effectiveTag = data.tagNumber ?? catchRecord.tagNumber;
        const effectiveWeight = data.weight ?? catchRecord.weight;

        if (species?.requiresAge && !effectiveAge) {
            return badRequest(`Pre druh ${species.name} je vek povinný`);
        }

        if (species?.requiresSex && effectiveSex === 'UNKNOWN') {
            return badRequest(`Pre druh ${species.name} je pohlavie povinné`);
        }

        if (species?.requiresTag && !effectiveTag) {
            return badRequest(`Pre druh ${species.name} je značka povinná`);
        }

        if (species?.requiresWeight && !effectiveWeight) {
            return badRequest(`Pre druh ${species.name} je váha povinná`);
        }

        // Update catch
        const updateData: Record<string, unknown> = {};

        if (data.speciesId) updateData.speciesId = data.speciesId;
        if (data.sex) updateData.sex = data.sex;
        if (data.age !== undefined) updateData.age = data.age;
        if (data.weight !== undefined) updateData.weight = data.weight;
        if (data.tagNumber !== undefined) updateData.tagNumber = data.tagNumber;
        if (data.shooterType) updateData.shooterType = data.shooterType;
        if (data.guestShooterName !== undefined) {
            updateData.guestShooterName = data.shooterType === 'MEMBER' ? null : data.guestShooterName;
        }
        if (data.huntingLocalityId) updateData.huntingLocalityId = data.huntingLocalityId;
        if (data.huntedAt) updateData.huntedAt = new Date(data.huntedAt);
        if (data.note !== undefined) updateData.note = data.note;

        const updated = await prisma.catch.update({
            where: { id },
            data: updateData,
            include: {
                species: { select: { id: true, name: true } },
                huntingLocality: { select: { id: true, name: true } },
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

        const catchRecord = await prisma.catch.findUnique({
            where: { id },
            include: { visit: true },
        });

        if (!catchRecord) {
            return notFound('Úlovok nebol nájdený');
        }

        // Check ownership or admin
        if (!canAccessResource(user, catchRecord.visit.memberId)) {
            return forbidden('Nemáte oprávnenie mazať cudzí úlovok');
        }

        // Non-admin cannot delete catches in closed visits
        if (!isAdmin(user) && catchRecord.visit.endDate !== null) {
            return forbidden('Úlovky v ukončenej návšteve nie je možné mazať');
        }

        // Get photos and delete files
        const photos = await prisma.catchPhoto.findMany({
            where: { catchId: id },
            select: { storageKey: true },
        });

        for (const photo of photos) {
            await deleteFile(photo.storageKey);
            // Also delete thumbnail
            await deleteFile(getThumbnailKey(photo.storageKey));
        }

        await prisma.catch.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
