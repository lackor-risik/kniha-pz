import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError, isAdmin, conflict, badRequest } from '@/lib/rbac';
import { validateRequest, visitCreateSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth();
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const memberId = searchParams.get('memberId');
        const localityId = searchParams.get('localityId');
        const active = searchParams.get('active'); // 'true' | 'false' | null

        const where: Record<string, unknown> = {};

        // Filter by member (for non-admins, can filter; for admins, can see all)
        if (memberId) {
            where.memberId = memberId;
        }

        if (localityId) {
            where.localityId = localityId;
        }

        if (active === 'true') {
            where.endDate = null;
        } else if (active === 'false') {
            where.endDate = { not: null };
        }

        // Get visits with catch count aggregation
        const [visits, total] = await Promise.all([
            prisma.visit.findMany({
                where,
                include: {
                    member: {
                        select: { id: true, displayName: true, avatarUrl: true },
                    },
                    locality: {
                        select: { id: true, name: true },
                    },
                    _count: {
                        select: { catches: true },
                    },
                },
                orderBy: { startDate: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.visit.count({ where }),
        ]);

        const result = visits.map((visit) => ({
            ...visit,
            isOpen: visit.endDate === null,
            catchCount: visit._count.catches,
            _count: undefined,
        }));

        return NextResponse.json({
            data: result,
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
        const validation = validateRequest(visitCreateSchema, body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { localityId, startDate, hasGuest, guestName, guestNote, note, memberId } = validation.data;

        // Determine target member - admin can specify memberId, otherwise use current user
        let targetMemberId = user.id;
        if (memberId && isAdmin(user)) {
            // Verify target member exists
            const targetMember = await prisma.member.findUnique({
                where: { id: memberId, isActive: true }
            });
            if (!targetMember) {
                return badRequest('Člen neexistuje alebo nie je aktívny');
            }
            targetMemberId = memberId;
        }

        // Check if locality exists and is active
        const locality = await prisma.locality.findUnique({
            where: { id: localityId },
        });

        if (!locality || !locality.isActive) {
            return badRequest('Lokalita neexistuje alebo nie je aktívna');
        }

        // Check if target member already has an active visit
        const activeVisit = await prisma.visit.findFirst({
            where: {
                memberId: targetMemberId,
                endDate: null,
            },
        });

        if (activeVisit) {
            return conflict(targetMemberId === user.id
                ? 'Už máte aktívnu návštevu. Najprv ju ukončite.'
                : 'Tento člen už má aktívnu návštevu.');
        }

        // Check if locality is occupied
        const occupiedVisit = await prisma.visit.findFirst({
            where: {
                localityId,
                endDate: null,
            },
            include: {
                member: { select: { displayName: true } },
            },
        });

        if (occupiedVisit) {
            return conflict(
                `Lokalita je už obsadená členom ${occupiedVisit.member.displayName}`
            );
        }

        // Create visit
        const visit = await prisma.visit.create({
            data: {
                memberId: targetMemberId,
                localityId,
                startDate: new Date(startDate),
                hasGuest,
                guestName: hasGuest ? guestName : null,
                guestNote: hasGuest ? guestNote : null,
                note,
            },
            include: {
                member: { select: { id: true, displayName: true } },
                locality: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(visit, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}
