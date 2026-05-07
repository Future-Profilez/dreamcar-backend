const cron = require('node-cron');
const prisma = require('../prismaconfig');
const Loggers = require('../utils/Logger');

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    const competitions = await prisma.competition.findMany({
      where: {
        instantWinEnabled: true,
        instantWinGenerated: false,
        status: 1, // Active competitions
        deletedAt: null
      },
      include: {
        instantWinPrizes: true
      }
    });

    for (const comp of competitions) {
      if (!comp.instantWinTriggerPercent) continue;

      const thresholdTickets = Math.floor((comp.totalTickets * comp.instantWinTriggerPercent) / 100);

      if (comp.soldTickets >= thresholdTickets) {
        Loggers.info(`Cron: Threshold reached for competition ${comp.id}. Generating instant wins...`);

        const totalPrizes = comp.instantWinPrizes.reduce((sum, p) => sum + p.quantity, 0);

        // Pick numbers from soldTickets + 1 to totalTickets
        const startRange = comp.soldTickets + 1;
        const endRange = comp.totalTickets;

        if (totalPrizes > (endRange - startRange + 1)) {
          Loggers.error(`Cron: Not enough unsold tickets to assign instant wins for competition ${comp.id}`);
          continue;
        }

        const winningNumbers = new Set();

        while (winningNumbers.size < totalPrizes) {
          const rand = Math.floor(Math.random() * (endRange - startRange + 1)) + startRange;
          winningNumbers.add(rand);
        }

        const numbersArray = Array.from(winningNumbers);
        let index = 0;

        await prisma.$transaction(async (tx) => {
          for (const prize of comp.instantWinPrizes) {
            for (let i = 0; i < prize?.quantity; i++) {
              await tx.instantWin.create({
                data: {
                  competitionId: comp.id,
                  prizeId: prize.id,
                  ticketNumber: numbersArray[index++]
                }
              });
            }
          }

          // Mark as generated
          await tx.competition.update({
            where: { id: comp.id },
            data: { instantWinGenerated: true }
          });
        });

        Loggers.info(`Cron: Instant wins generated successfully for competition ${comp.id}`);
      }
    }
  } catch (error) {
    Loggers.error(`Cron Error (InstantWin): ${error.message}`);
  }
});
