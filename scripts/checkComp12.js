const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const comp = await prisma.competition.findFirst({
    where: { id: 12 },
    include: { prizes: true }
  });
  console.log("Competition #12:", JSON.stringify(comp, null, 2));
}

main().finally(() => prisma.$disconnect());
