const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const m = await p.member.count();
    const v = await p.visit.count();
    const c = await p.catch.count();
    console.log('Members:', m);
    console.log('Visits:', v);
    console.log('Catches:', c);
}

main().finally(() => p.$disconnect());
