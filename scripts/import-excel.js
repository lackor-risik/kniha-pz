/**
 * Import script for Navstevy.xlsx
 * Imports: Members, Visits, Catches (3 seasons)
 * Uses existing: Localities, Species
 */

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

// Excel date to JS Date (Excel uses days since 1900-01-01)
function excelDateToJS(excelDate) {
    if (!excelDate) return null;
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date;
}

// Normalize name for comparison
function normalizeName(name) {
    if (!name) return '';
    return name.trim().toLowerCase()
        .replace(/ľ/g, 'l')
        .replace(/š/g, 's')
        .replace(/č/g, 'c')
        .replace(/ž/g, 'z')
        .replace(/ý/g, 'y')
        .replace(/á/g, 'a')
        .replace(/í/g, 'i')
        .replace(/é/g, 'e')
        .replace(/ú/g, 'u')
        .replace(/ô/g, 'o')
        .replace(/ä/g, 'a')
        .replace(/ň/g, 'n')
        .replace(/ť/g, 't')
        .replace(/ď/g, 'd')
        .replace(/ř/g, 'r');
}

// Generate email from name
function generateEmail(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        const first = normalizeName(parts[0]);
        const last = normalizeName(parts[parts.length - 1]);
        return `${first}.${last}@pzskalka.local`;
    }
    return `${normalizeName(name)}@pzskalka.local`;
}

async function main() {
    console.log('Starting import...\n');

    // Load Excel file
    const filePath = path.join(__dirname, '../public/Navstevy.xlsx');
    const workbook = XLSX.readFile(filePath);

    // Load existing data
    const existingLocalities = await prisma.locality.findMany();
    const existingSpecies = await prisma.species.findMany();
    const existingMembers = await prisma.member.findMany();

    console.log(`Existing: ${existingLocalities.length} localities, ${existingSpecies.length} species, ${existingMembers.length} members\n`);

    // Create lookup maps
    const localityMap = new Map(); // name -> id
    existingLocalities.forEach(l => {
        localityMap.set(l.name.toLowerCase(), l.id);
    });

    const speciesMap = new Map(); // name -> id
    existingSpecies.forEach(s => {
        speciesMap.set(s.name.toLowerCase(), s.id);
    });

    const memberMap = new Map(); // name -> id
    existingMembers.forEach(m => {
        memberMap.set(normalizeName(m.displayName), m.id);
    });

    // =========================================================================
    // STEP 1: Import Members from "Clenovia" sheet
    // =========================================================================
    console.log('=== STEP 1: Importing Members ===');
    const clenoviaSheet = workbook.Sheets['Clenovia'];
    const clenoviaData = XLSX.utils.sheet_to_json(clenoviaSheet, { header: 1 });

    let membersCreated = 0;
    let membersSkipped = 0;

    for (let i = 1; i < clenoviaData.length; i++) {
        const row = clenoviaData[i];
        const name = row[0];
        if (!name) continue;

        const normalizedName = normalizeName(name);
        if (memberMap.has(normalizedName)) {
            membersSkipped++;
            continue;
        }

        // Create new member
        const email = generateEmail(name);
        try {
            const member = await prisma.member.create({
                data: {
                    email: email,
                    displayName: name.trim(),
                    role: 'MEMBER',
                    isActive: true,
                }
            });
            memberMap.set(normalizedName, member.id);
            membersCreated++;
            console.log(`  Created: ${name} (${email})`);
        } catch (err) {
            console.log(`  Error creating ${name}: ${err.message}`);
        }
    }

    console.log(`Members: ${membersCreated} created, ${membersSkipped} skipped\n`);

    // =========================================================================
    // STEP 2: Import Visits from "Navstevy" sheet
    // =========================================================================
    console.log('=== STEP 2: Importing Visits ===');
    const navstevySheet = workbook.Sheets['Navstevy'];
    const navstevyData = XLSX.utils.sheet_to_json(navstevySheet, { header: 1 });

    let visitsCreated = 0;
    let visitsSkipped = 0;
    let visitsErrors = 0;
    const visitKeyMap = new Map(); // Excel Key -> DB visit id

    for (let i = 1; i < navstevyData.length; i++) {
        const row = navstevyData[i];
        const [key, meno, host, casPrichodu, casOdchodu, lokalita, ulovok, casLovu, miestoLovu, cisloZnacky, poznamky] = row;

        if (!meno || !casPrichodu || !lokalita) continue;

        // Find member
        const memberId = memberMap.get(normalizeName(meno));
        if (!memberId) {
            console.log(`  Warning: Member not found: ${meno}`);
            visitsErrors++;
            continue;
        }

        // Find locality
        const localityId = localityMap.get(lokalita.toLowerCase());
        if (!localityId) {
            console.log(`  Warning: Locality not found: ${lokalita}`);
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
            visitKeyMap.set(key, visit.id);
            visitsCreated++;

            if (visitsCreated % 500 === 0) {
                console.log(`  Progress: ${visitsCreated} visits created...`);
            }
        } catch (err) {
            visitsErrors++;
        }
    }

    console.log(`Visits: ${visitsCreated} created, ${visitsSkipped} skipped, ${visitsErrors} errors\n`);

    // =========================================================================
    // STEP 3: Import Catches from "Plnenie planu" sheets
    // =========================================================================
    console.log('=== STEP 3: Importing Catches ===');

    const catchSheets = ['Plnenie planu 2324', 'Plnenie planu 2425', 'Plnenie planu'];
    let catchesCreated = 0;
    let catchesErrors = 0;

    for (const sheetName of catchSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        console.log(`  Processing: ${sheetName}`);
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const [id, zver, meno, casLovu, lokalita, pohlavie, vek, vaha, cisloZnacky, poznamka] = row;

            if (!zver || !meno || !casLovu) continue;

            // Find species
            const speciesId = speciesMap.get(zver.toLowerCase());
            if (!speciesId) {
                console.log(`    Warning: Species not found: ${zver}`);
                catchesErrors++;
                continue;
            }

            // Find member
            const memberId = memberMap.get(normalizeName(meno));
            if (!memberId) {
                console.log(`    Warning: Member not found: ${meno}`);
                catchesErrors++;
                continue;
            }

            // Find hunting locality
            const huntingLocalityId = localityMap.get(lokalita?.toLowerCase());
            if (!huntingLocalityId) {
                console.log(`    Warning: Locality not found: ${lokalita}`);
                catchesErrors++;
                continue;
            }

            const huntedAt = excelDateToJS(casLovu);
            if (!huntedAt) {
                catchesErrors++;
                continue;
            }

            // Find matching visit (same member, huntedAt within visit period)
            const visit = await prisma.visit.findFirst({
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
                // Create a visit for this catch
                const createdVisit = await prisma.visit.create({
                    data: {
                        memberId,
                        localityId: huntingLocalityId,
                        startDate: huntedAt,
                        endDate: huntedAt,
                        hasGuest: false,
                    }
                });

                await prisma.catch.create({
                    data: {
                        visitId: createdVisit.id,
                        speciesId,
                        sex: pohlavie === 'samčie' ? 'MALE' : pohlavie === 'samičie' ? 'FEMALE' : 'UNKNOWN',
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
            } else {
                // Use existing visit
                await prisma.catch.create({
                    data: {
                        visitId: visit.id,
                        speciesId,
                        sex: pohlavie === 'samčie' ? 'MALE' : pohlavie === 'samičie' ? 'FEMALE' : 'UNKNOWN',
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
            }
        }
    }

    console.log(`Catches: ${catchesCreated} created, ${catchesErrors} errors\n`);

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('=== IMPORT COMPLETE ===');
    console.log(`Members created: ${membersCreated}`);
    console.log(`Visits created: ${visitsCreated}`);
    console.log(`Catches created: ${catchesCreated}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
