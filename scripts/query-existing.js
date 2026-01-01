const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
    const prisma = new PrismaClient();

    try {
        const localities = await prisma.locality.findMany({ select: { id: true, name: true } });
        const species = await prisma.species.findMany({ select: { id: true, name: true } });
        const members = await prisma.member.findMany({ select: { id: true, displayName: true, email: true } });

        const output = {
            localities: localities,
            species: species,
            members: members
        };

        fs.writeFileSync(path.join(__dirname, '../existing-data.json'), JSON.stringify(output, null, 2));
        console.log('Output saved to existing-data.json');
        console.log(`Localities: ${localities.length}, Species: ${species.length}, Members: ${members.length}`);
    } finally {
        await prisma.$disconnect();
    }
}

main();
