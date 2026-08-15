/**
 * Generates realistic test data for local development/QA:
 * - Test members (with password login, mix of roles/active states)
 * - Test visits (spread across the active season, some open/ended, some with guests)
 * - Test harvest plan items (for the active season)
 * - Test catches (linked to visits, respecting each species' required fields)
 *
 * Safe to re-run: previous test data (members with @test.local emails and
 * everything they own) is removed first.
 *
 * Usage: npm run db:seed-test-data
 */
import { PrismaClient, Role, Sex, ShooterType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'test123';

const TEST_MEMBERS: {
    email: string;
    displayName: string;
    role: Role;
    isActive?: boolean;
}[] = [
    { email: 'jan.novak@test.local', displayName: 'Ján Novák', role: Role.MEMBER },
    { email: 'peter.horvath@test.local', displayName: 'Peter Horváth', role: Role.MEMBER },
    { email: 'martin.kovac@test.local', displayName: 'Martin Kováč', role: Role.MEMBER },
    { email: 'jozef.varga@test.local', displayName: 'Jozef Varga', role: Role.ADMIN },
    { email: 'stefan.kovalcik@test.local', displayName: 'Štefan Kovalčík', role: Role.MEMBER },
    { email: 'lubos.baran@test.local', displayName: 'Ľuboš Baran', role: Role.MEMBER, isActive: false },
];

function daysAgo(n: number, hour = 8): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, 0, 0, 0);
    return d;
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function cleanupPreviousTestData() {
    const existingMembers = await prisma.member.findMany({
        where: { email: { endsWith: '@test.local' } },
        select: { id: true },
    });
    const memberIds = existingMembers.map((m) => m.id);

    if (memberIds.length === 0) return;

    const visitIds = (
        await prisma.visit.findMany({ where: { memberId: { in: memberIds } }, select: { id: true } })
    ).map((v) => v.id);

    await prisma.catch.deleteMany({ where: { visitId: { in: visitIds } } });
    await prisma.visit.deleteMany({ where: { id: { in: visitIds } } });
    await prisma.member.deleteMany({ where: { id: { in: memberIds } } });

    console.log(`  Odstránené predchádzajúce testovacie dáta (${memberIds.length} členov)`);
}

async function main() {
    console.log('🧪 Generujem testovacie dáta...');

    await cleanupPreviousTestData();

    // ------------------------------------------------------------------
    // Members
    // ------------------------------------------------------------------
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
    const members = [];
    for (const m of TEST_MEMBERS) {
        const member = await prisma.member.create({
            data: {
                email: m.email,
                displayName: m.displayName,
                role: m.role,
                isActive: m.isActive ?? true,
                passwordHash,
                forcePasswordChange: false,
            },
        });
        members.push(member);
    }
    console.log(`✓ Vytvorených ${members.length} testovacích členov (heslo: ${TEST_PASSWORD})`);

    const activeMembers = members.filter((m) => m.isActive);

    const localities = await prisma.locality.findMany();
    const speciesList = await prisma.species.findMany();
    const season = await prisma.huntingSeason.findFirst({ where: { isActive: true } });

    if (!season) {
        throw new Error('Nenájdená žiadna aktívna sezóna. Najprv spustite `npm run db:seed`.');
    }
    if (localities.length === 0 || speciesList.length === 0) {
        throw new Error('Chýbajú lokality alebo druhy zveri. Najprv spustite `npm run db:seed`.');
    }

    // ------------------------------------------------------------------
    // Harvest plan
    // ------------------------------------------------------------------
    const planSpecies = speciesList.slice(0, Math.min(6, speciesList.length));
    let sortOrder = 0;
    for (const species of planSpecies) {
        await prisma.harvestPlanItem.upsert({
            where: { seasonId_speciesId: { seasonId: season.id, speciesId: species.id } },
            update: {},
            create: {
                seasonId: season.id,
                speciesId: species.id,
                plannedCount: 3 + Math.floor(Math.random() * 6), // 3-8
                sortOrder: sortOrder++,
                note: null,
            },
        });
    }
    console.log(`✓ Plán lovu: ${planSpecies.length} položiek pre sezónu ${season.name}`);

    // ------------------------------------------------------------------
    // Visits (+ catches)
    // ------------------------------------------------------------------
    const guestNames = ['Milan Sýkora', 'Karol Beňo', 'Tomáš Uhrík'];
    let visitCount = 0;
    let catchCount = 0;

    for (let i = 0; i < 14; i++) {
        const member = pick(activeMembers);
        const locality = pick(localities);
        const startDaysAgo = 60 - i * 4; // spread over the last ~2 months
        const hasGuest = i % 5 === 0;
        const isOngoing = i === 0; // most recent visit is still active

        const startDate = daysAgo(Math.max(startDaysAgo, 0), 7 + (i % 6));
        const endDate = isOngoing
            ? null
            : new Date(startDate.getTime() + (2 + Math.floor(Math.random() * 4)) * 60 * 60 * 1000);

        const visit = await prisma.visit.create({
            data: {
                memberId: member.id,
                localityId: locality.id,
                startDate,
                endDate,
                hasGuest,
                guestName: hasGuest ? pick(guestNames) : null,
                guestNote: hasGuest ? 'Poľovný hosť' : null,
                note: i % 3 === 0 ? 'Testovacia poznámka k návšteve' : null,
            },
        });
        visitCount++;

        // ~60% of finished visits get 0-2 catches
        if (endDate && Math.random() < 0.6) {
            const numCatches = 1 + Math.floor(Math.random() * 2);
            for (let c = 0; c < numCatches; c++) {
                const species = pick(speciesList);
                const isGuestShooter = hasGuest && Math.random() < 0.5;
                const huntedAt = new Date(
                    startDate.getTime() + Math.floor(Math.random() * (endDate.getTime() - startDate.getTime()))
                );

                await prisma.catch.create({
                    data: {
                        visitId: visit.id,
                        speciesId: species.id,
                        sex: species.requiresSex ? pick([Sex.MALE, Sex.FEMALE]) : Sex.UNKNOWN,
                        age: species.requiresAge ? pick(['0,5 roka', '1,5 roka', '2,5 roka', '3+ roky']) : null,
                        weight: species.requiresWeight
                            ? Math.round((15 + Math.random() * 90) * 100) / 100
                            : null,
                        tagNumber: species.requiresTag ? `T-${1000 + visitCount * 10 + c}` : null,
                        shooterType: isGuestShooter ? ShooterType.GUEST : ShooterType.MEMBER,
                        guestShooterName: isGuestShooter ? visit.guestName : null,
                        huntingLocalityId: locality.id,
                        huntedAt,
                        note: c === 0 && i % 4 === 0 ? 'Testovacia poznámka k úlovku' : null,
                    },
                });
                catchCount++;
            }
        }
    }

    console.log(`✓ Vytvorených ${visitCount} testovacích návštev, ${catchCount} testovacích úlovkov`);
    console.log('✅ Testovacie dáta vygenerované!');
}

main()
    .catch((e) => {
        console.error('❌ Generovanie testovacích dát zlyhalo:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
