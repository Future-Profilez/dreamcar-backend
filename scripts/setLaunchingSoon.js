const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);

  // Set Porsche 911 GT3 RS (ID 9) to Launching Soon (status 2)
  const updated = await prisma.competition.update({
    where: { id: 9 },
    data: {
      status: 2,
      startTime: futureDate
    }
  });

  console.log("Updated competition 9 to Launching Soon:", updated.title, "startTime:", updated.startTime, "status:", updated.status);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
