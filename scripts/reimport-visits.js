/**
 * Reimport script for Navstevy (1).xlsx
 * 1. Deletes ALL catch photos, catches, and visits
 * 2. Imports visits from "Navstevy" sheet
 * 3. Imports catches from "Plnenie planu" sheets
 * 
 * Does NOT touch: Members, Localities, Species, Seasons, Harvest Plan, Announcements, Cabin Bookings
 * 
 * Usage (local):   node scripts/reimport-visits.js
 * Usage (docker):  docker-compose exec app node scripts/reimport-visits.js
 */

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

// Excel date to JS Date
function excelDateToJS(excelDate) {
    if (!excelDate) return null;
    if (typeof excelDate === 'string') {
        const d = new Date(excelDate);
        return isNaN(d.getTime()) ? null : d;
    }
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date;
}

// Normalize name for comparison
function normalizeName(name) {
    if (!name) return '';
    return name.trim().toLowerCase()
        .replace(/ľ/g, 'l').replace(/š/g, 's').replace(/č/g, 'c').replace(/ž/g, 'z')
        .replace(/ý/g, 'y').replace(/á/g, 'a').replace(/í/g, 'i').replace(/é/g, 'e')
        .replace(/ú/g, 'u').replace(/ô/g, 'o').replace(/ä/g, 'a').replace(/ň/g, 'n')
        .replace(/ť/g, 't').replace(/ď/g, 'd').replace(/ř/g, 'r');
}

async function main() {
    const filePath = path.join(__dirname, '../public/Navstevy (1).xlsx');
    console.log(`Loading: ${filePath}\n`);
    const workbook = XLSX.readFile(filePath);

    // =========================================================================
    // STEP 0: Delete existing visits and catches
    // =========================================================================
    console.log('=== STEP 0: Deleting existing data ===');

    const photoCount = await prisma.catchPhoto.count();
    const catchCount = await prisma.catch.count();
    const visitCount = await prisma.visit.count();
    console.log(`  Found: ${visitCount} visits, ${catchCount} catches, ${photoCount} photos`);

    await prisma.$transaction([
        prisma.catchPhoto.deleteMany(),
        prisma.catch.deleteMany(),
        prisma.visit.deleteMany(),
    ]);
    console.log('  Deleted all visits, catches, and photos.\n');

    // =========================================================================
    // Load lookup data
    // =========================================================================
    const existingLocalities = await prisma.locality.findMany();
    const existingSpecies = await prisma.species.findMany();
    const existingMembers = await prisma.member.findMany();

    console.log(`Existing: ${existingLocalities.length} localities, ${existingSpecies.length} species, ${existingMembers.length} members\n`);

    const localityMap = new Map();
    existingLocalities.forEach(l => localityMap.set(l.name.toLowerCase(), l.id));

    const speciesMap = new Map();
    existingSpecies.forEach(s => speciesMap.set(s.name.toLowerCase(), s.id));

    const memberMap = new Map();
    existingMembers.forEach(m => memberMap.set(normalizeName(m.displayName), m.id));

    // =========================================================================
    // STEP 1: Import Visits from "Navstevy" sheet
    // =========================================================================
    console.log('=== STEP 1: Importing Visits ===');
    const navstevySheet = workbook.Sheets['Navstevy'];
    const navstevyData = XLSX.utils.sheet_to_json(navstevySheet, { header: 1 });

    let visitsCreated = 0;
    let visitsErrors = 0;
    const visitMap = new Map(); // key -> visit.id

    for (let i = 1; i < navstevyData.length; i++) {
        const row = navstevyData[i];
        const [key, meno, host, casPrichodu, casOdchodu, lokalita, ulovok, casLovu, miestoLovu, cisloZnacky, poznamky] = row;

        if (!meno || !casPrichodu || !lokalita) continue;

        const memberId = memberMap.get(normalizeName(meno));
        if (!memberId) {
            console.log(`  Warning: Member not found: "${meno}"`);
            visitsErrors++;
            continue;
        }

        const localityId = localityMap.get(lokalita.toLowerCase());
        if (!localityId) {
            console.log(`  Warning: Locality not found: "${lokalita}"`);
            visitsErrors++;
            continue;
        }

        const startDate = excelDateToJS(casPrichodu);
        const endDate = casOdchodu ? excelDateToJS(casOdchodu) : null;
        const hasGuest = host === true;
        const note = poznamky || null;

        if (!startDate) {
            visitsErrors++;
            continue;
        }

        try {
            const visit = await prisma.visit.create({
                data: {
                    memberId,
                    localityId,
                    startDate,
                    endDate,
                    hasGuest,
                    guestName: hasGuest ? 'Hosť' : null,
                    note,
                }
            });
            visitMap.set(key, visit.id);
            visitsCreated++;

            if (visitsCreated % 500 === 0) {
                console.log(`  Progress: ${visitsCreated} visits...`);
            }
        } catch (err) {
            console.log(`  Error row ${i}: ${err.message}`);
            visitsErrors++;
        }
    }

    console.log(`Visits: ${visitsCreated} created, ${visitsErrors} errors\n`);

    // =========================================================================
    // STEP 2: Import Catches from "Plnenie planu" sheets
    // =========================================================================
    console.log('=== STEP 2: Importing Catches ===');

    const catchSheets = ['Plnenie planu 2324', 'Plnenie planu 2425', 'Plnenie planu'];
    let catchesCreated = 0;
    let catchesErrors = 0;
    let autoVisitsCreated = 0;

    for (const sheetName of catchSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        console.log(`  Processing: ${sheetName}`);
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const [id, zver, meno, casLovu, lokalita, pohlavie, vek, vaha, cisloZnacky, poznamka] = row;

            if (!zver || !meno || !casLovu) continue;

            const speciesId = speciesMap.get(zver.toLowerCase());
            if (!speciesId) {
                console.log(`    Warning: Species not found: "${zver}"`);
                catchesErrors++;
                continue;
            }

            const memberId = memberMap.get(normalizeName(meno));
            if (!memberId) {
                console.log(`    Warning: Member not found: "${meno}"`);
                catchesErrors++;
                continue;
            }

            const huntingLocalityId = localityMap.get(lokalita?.toLowerCase());
            if (!huntingLocalityId) {
                console.log(`    Warning: Locality not found: "${lokalita}"`);
                catchesErrors++;
                continue;
            }

            const huntedAt = excelDateToJS(casLovu);
            if (!huntedAt) {
                catchesErrors++;
                continue;
            }

            // Find matching visit
            let visit = await prisma.visit.findFirst({
                where: {
                    memberId,
                    startDate: { lte: huntedAt },
                    OR: [
                        { endDate: null },
                        { endDate: { gte: huntedAt } }
                    ]
                },
                orderBy: { startDate: 'desc' }
            });

            if (!visit) {
                // Create an auto-visit for this catch
                visit = await prisma.visit.create({
                    data: {
                        memberId,
                        localityId: huntingLocalityId,
                        startDate: huntedAt,
                        endDate: huntedAt,
                        hasGuest: false,
                    }
                });
                autoVisitsCreated++;
            }

            try {
                let sex = 'UNKNOWN';
                if (pohlavie === 'samčie' || pohlavie === 'samčí') sex = 'MALE';
                else if (pohlavie === 'samičie' || pohlavie === 'samičí') sex = 'FEMALE';

                await prisma.catch.create({
                    data: {
                        visitId: visit.id,
                        speciesId,
                        sex,
                        age: vek ? String(vek) : null,
                        weight: vaha ? parseFloat(vaha) : null,
                        tagNumber: cisloZnacky || null,
                        shooterType: 'MEMBER',
                        huntingLocalityId,
                        huntedAt,
                        note: poznamka || null,
                    }
                });
                catchesCreated++;
            } catch (err) {
                console.log(`    Error catch row ${i}: ${err.message}`);
                catchesErrors++;
            }
        }
    }

    console.log(`Catches: ${catchesCreated} created, ${catchesErrors} errors`);
    console.log(`Auto-visits (for homeless catches): ${autoVisitsCreated}\n`);

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('=== REIMPORT COMPLETE ===');
    console.log(`Visits imported:       ${visitsCreated}`);
    console.log(`Auto-visits created:   ${autoVisitsCreated}`);
    console.log(`Catches imported:      ${catchesCreated}`);
    console.log(`Total visits in DB:    ${await prisma.visit.count()}`);
    console.log(`Total catches in DB:   ${await prisma.catch.count()}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
