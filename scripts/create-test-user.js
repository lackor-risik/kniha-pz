const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hash = await bcrypt.hash('test123', 10);
    const member = await prisma.member.upsert({
        where: { email: 'test@test.local' },
        create: {
            email: 'test@test.local',
            displayName: 'Test Člen',
            role: 'MEMBER',
            passwordHash: hash,
            forcePasswordChange: false,
        },
        update: {
            passwordHash: hash,
            forcePasswordChange: false,
        },
    });
    console.log('Created:', member.id, member.displayName);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
