/**
 * Fix remaining catches - handle species name variations
 */
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

function excelDateToJS(excelDate) {
    if (!excelDate) return null;
    return new Date((excelDate - 25569) * 86400 * 1000);
}

function normalizeName(name) {
    if (!name) return '';
    return name.trim().toLowerCase()
        .replace(/ľ/g, 'l').replace(/š/g, 's').replace(/č/g, 'c')
        .replace(/ž/g, 'z').replace(/ý/g, 'y').replace(/á/g, 'a')
        .replace(/í/g, 'i').replace(/é/g, 'e').replace(/ú/g, 'u')
        .replace(/ô/g, 'o').replace(/ä/g, 'a').replace(/ň/g, 'n')
        .replace(/ť/g, 't').replace(/ď/g, 'd').replace(/ř/g, 'r');
}

// Map variations to canonical species names
const SPECIES_ALIASES = {
    'jeleň i.vt': 'Jeleň I. VT',
    'lanštiak': 'Jeleň IV.VT', // or create new?
};

async function main() {
    console.log('Fixing remaining catches...\n');

    const filePath = path.join(__dirname, '../public/Navstevy.xlsx');
    const workbook = XLSX.readFile(filePath);

    // Update species name if needed
    try {
        await prisma.species.update({
            where: { name: 'Jeleň I. VT' },
            data: { name: 'Jeleň I.VT' }
        });
        console.log('Updated "Jeleň I. VT" -> "Jeleň I.VT"');
    } catch (e) {
        console.log('Species name already correct or not found');
    }

    // Create Lanštiak species if not exists
    try {
        await prisma.species.upsert({
            where: { name: 'Lanštiak' },
            update: {},
            create: {
                name: 'Lanštiak',
                requiresAge: true,
                requiresSex: true,
                requiresTag: true,
                requiresWeight: true,
                isActive: true
            }
        });
        console.log('Created/updated species: Lanštiak');
    } catch (e) {
        console.log('Error with Lanštiak:', e.message);
    }

    // Reload species
    const existingSpecies = await prisma.species.findMany();
    const existingLocalities = await prisma.locality.findMany();
    const existingMembers = await prisma.member.findMany();

    const speciesMap = new Map();
    existingSpecies.forEach(s => speciesMap.set(s.name.toLowerCase(), s.id));

    const localityMap = new Map();
    existingLocalities.forEach(l => localityMap.set(l.name.toLowerCase(), l.id));

    const memberMap = new Map();
    existingMembers.forEach(m => memberMap.set(normalizeName(m.displayName), m.id));

    // Process sheets for missing catches
    const catchSheets = ['Plnenie planu 2324', 'Plnenie planu 2425', 'Plnenie planu'];
    let catchesCreated = 0;

    for (const sheetName of catchSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        console.log(`\nProcessing: ${sheetName}`);
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const [id, zver, meno, casLovu, lokalita, pohlavie, vek, vaha, cisloZnacky, poznamka] = row;

            if (!zver || !meno || !casLovu) continue;

            // Normalize species name
            let speciesId = speciesMap.get(zver.toLowerCase());
            if (!speciesId) {
                // Try alias
                const alias = SPECIES_ALIASES[zver.toLowerCase()];
                if (alias) {
                    speciesId = speciesMap.get(alias.toLowerCase());
                }
            }

            if (!speciesId) {
                console.log(`  Skipping: species "${zver}" not found`);
                continue;
            }

            const memberId = memberMap.get(normalizeName(meno));
            if (!memberId) continue;

            const huntingLocalityId = localityMap.get(lokalita?.toLowerCase());
            if (!huntingLocalityId) continue;

            const huntedAt = excelDateToJS(casLovu);
            if (!huntedAt) continue;

            // Check if catch already exists (by tag number)
            if (cisloZnacky) {
                const existing = await prisma.catch.findFirst({
                    where: { tagNumber: cisloZnacky }
                });
                if (existing) continue;
            }

            // Find visit
            let visit = await prisma.visit.findFirst({
                where: {
                    memberId,
                    startDate: { lte: huntedAt },
                    OR: [{ endDate: null }, { endDate: { gte: huntedAt } }]
                },
                orderBy: { startDate: 'desc' }
            });

            if (!visit) {
                visit = await prisma.visit.create({
                    data: {
                        memberId,
                        localityId: huntingLocalityId,
                        startDate: huntedAt,
                        endDate: huntedAt,
                        hasGuest: false,
                    }
                });
            }

            try {
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
                console.log(`  Created catch: ${zver} by ${meno}`);
            } catch (e) {
                // Probably duplicate
            }
        }
    }

    console.log(`\nAdditional catches created: ${catchesCreated}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
