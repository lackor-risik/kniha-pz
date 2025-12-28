import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Admin user
    const admin = await prisma.member.upsert({
        where: { email: 'lackor@gmail.com' },
        update: {},
        create: {
            email: 'lackor@gmail.com',
            displayName: 'Richard Lacko',
            role: Role.ADMIN,
            isActive: true,
        },
    });
    console.log('✓ Admin user created:', admin.email);

    // Create Localities
    const localities = [
        { name: 'Blaufúska', description: 'Blaufúska' },
        { name: 'Dirháb', description: 'Dirháb' },
        { name: 'Hintergrund', description: 'Hintergrund' },
        { name: 'Hochkolung', description: 'Hochkolung' },
        { name: 'Jánska', description: 'Jánska' },
        { name: 'Kaltrin', description: 'Kaltrin' },
        { name: 'Kováčová', description: 'Kováčová' },
        { name: 'Majer', description: 'Majer' },
        { name: 'Podskalie', description: 'Podskalie' },
        { name: 'Predná', description: 'Predná' },
        { name: 'Predný Cvinget', description: 'Predný Cvinget' },
        { name: 'Rottfarba', description: 'Rottfarba' },
        { name: 'Tajlungy', description: 'Tajlungy' },
        { name: 'Tischl', description: 'Tischl' },
        { name: 'Tmavá', description: 'Tmavá' },
        { name: 'Ulehlovka', description: 'Ulehlovka' },
        { name: 'Vlčí vrch', description: 'Vlčí vrch' },
        { name: 'Vlčia jama', description: 'Vlčia jama' },
        { name: 'Zadný Cvinget', description: 'Zadný Cvinget' },
    ];

    for (const loc of localities) {
        await prisma.locality.upsert({
            where: { name: loc.name },
            update: {},
            create: loc,
        });
    }
    console.log('✓ Localities created:', localities.length);

    // Create Species
    const speciesList = [
        { name: 'Diviača', requiresAge: false, requiresSex: true, requiresTag: true, requiresWeight: true },
        { name: 'Diviak', requiresAge: true, requiresSex: true, requiresTag: true, requiresWeight: true },
        { name: 'Jazvec lesný', requiresAge: false, requiresSex: false, requiresTag: false, requiresWeight: false },
        { name: 'Jeleň I. VT', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: true },
        { name: 'Jeleň II.VT', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: false },
        { name: 'Jeleň III.VT', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: true },
        { name: 'Jeleň IV.VT', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: true },
        { name: 'Jelenica', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: true },
        { name: 'Jelienča', requiresAge: false, requiresSex: true, requiresTag: true, requiresWeight: true },
        { name: 'Líška hrdzavá', requiresAge: false, requiresSex: false, requiresTag: false, requiresWeight: false },
        { name: 'Srna', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: true },
        { name: 'Srnča', requiresAge: false, requiresSex: true, requiresTag: true, requiresWeight: true },
        { name: 'Srnec I.VT', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: true },
        { name: 'Srnec II.VT', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: true },
        { name: 'Srnec III.VT', requiresAge: true, requiresSex: false, requiresTag: true, requiresWeight: true },
        { name: 'Vlk dravý', requiresAge: true, requiresSex: true, requiresTag: true, requiresWeight: true },
    ];

    for (const species of speciesList) {
        await prisma.species.upsert({
            where: { name: species.name },
            update: {},
            create: species,
        });
    }
    console.log('✓ Species created:', speciesList.length);

    // Create Hunting Season (current)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    // Season year is determined: Apr-Dec = current/next, Jan-Mar = previous/current
    const seasonStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
    const seasonEndYear = seasonStartYear + 1;

    const season = await prisma.huntingSeason.upsert({
        where: { name: `${seasonStartYear}/${seasonEndYear}` },
        update: { isActive: true },
        create: {
            name: `${seasonStartYear}/${seasonEndYear}`,
            dateFrom: new Date(`${seasonStartYear}-04-01`),
            dateTo: new Date(`${seasonEndYear}-03-31`),
            isActive: true,
        },
    });
    console.log('✓ Hunting season created:', season.name);

    // Create Cabin
    const cabin = await prisma.cabin.upsert({
        where: { name: 'Žerucha' },
        update: {},
        create: {
            name: 'Žerucha',
            description: 'Poľovnícka chata.',
        },
    });
    console.log('✓ Cabin created:', cabin.name);

    console.log('✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
