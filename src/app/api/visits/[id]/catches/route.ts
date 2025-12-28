import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, badRequest, notFound, forbidden, canAccessResource } from '@/lib/rbac';
import { validateRequest, catchCreateSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
    try {
        await requireAuth();
        const { id: visitId } = await params;

        const visit = await prisma.visit.findUnique({
            where: { id: visitId },
            include: { locality: true },
        });

        if (!visit) {
            return notFound('Návšteva nebola nájdená');
        }

        const catches = await prisma.catch.findMany({
            where: { visitId },
            include: {
                species: { select: { id: true, name: true } },
                huntingLocality: { select: { id: true, name: true } },
                _count: { select: { photos: true } },
            },
            orderBy: { huntedAt: 'desc' },
        });

        return NextResponse.json(catches);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const user = await requireAuth();
        const { id: visitId } = await params;

        // Get visit with member check
        const visit = await prisma.visit.findUnique({
            where: { id: visitId },
            include: { locality: true },
        });

        if (!visit) {
            return notFound('Návšteva nebola nájdená');
        }

        // Check permissions:
        // - Admin can add catches to any visit
        // - Member can add catches to their own visits (including ended visits)
        const isAdmin = user.role === 'ADMIN';
        const isOwner = user.id === visit.memberId;

        if (!isAdmin && !isOwner) {
            return forbidden('Nemáte oprávnenie pridávať úlovky do tejto návštevy');
        }

        // Note: We no longer block adding catches to ended visits for owners

        const body = await request.json();
        const validation = validateRequest(catchCreateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const {
            speciesId,
            sex,
            age,
            weight,
            tagNumber,
            shooterType,
            guestShooterName,
            huntingLocalityId,
            huntedAt,
            note,
        } = validation.data;

        // Validate species exists and check requirements
        const species = await prisma.species.findUnique({ where: { id: speciesId } });
        if (!species) {
            return badRequest('Druh zveri nebol nájdený');
        }

        // Validate species requirements
        if (species.requiresAge && !age) {
            return badRequest('Druh vyžaduje zadanie veku');
        }
        if (species.requiresSex && sex === 'UNKNOWN') {
            return badRequest('Druh vyžaduje zadanie pohlavia');
        }
        if (species.requiresTag && !tagNumber) {
            return badRequest('Druh vyžaduje číslo značky');
        }
        if (species.requiresWeight && !weight) {
            return badRequest('Druh vyžaduje zadanie váhy');
        }

        // Validate shooter type
        if (shooterType === 'GUEST') {
            if (!visit.hasGuest) {
                return badRequest('Návšteva nemá hosťa, nie je možné priradiť úlovok hosťovi');
            }
            if (!guestShooterName) {
                return badRequest('Meno hosťa je povinné');
            }
        }

        // Validate hunting time is within visit period
        const huntedDate = new Date(huntedAt);
        if (huntedDate < new Date(visit.startDate)) {
            return badRequest('Čas lovu nemôže byť pred začiatkom návštevy');
        }
        if (visit.endDate && huntedDate > new Date(visit.endDate)) {
            return badRequest('Čas lovu nemôže byť po ukončení návštevy');
        }

        // Use visit locality if not specified
        const finalHuntingLocalityId = huntingLocalityId || visit.localityId;

        const catchRecord = await prisma.catch.create({
            data: {
                visitId,
                speciesId,
                sex: sex || 'UNKNOWN',
                age,
                weight,
                tagNumber,
                shooterType: shooterType || 'MEMBER',
                guestShooterName,
                huntingLocalityId: finalHuntingLocalityId,
                huntedAt: huntedDate,
                note,
            },
            include: {
                species: { select: { id: true, name: true } },
                huntingLocality: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(catchRecord, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
