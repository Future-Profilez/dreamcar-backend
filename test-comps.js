const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const comps = await prisma.competition.findMany();
  console.log(comps.map(c => ({ id: c.id, title: c.title, slug: c.slug })));
}
test().finally(() => prisma.$disconnect());
