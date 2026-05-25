const cron = require('node-cron');
const prisma = require('../prismaconfig');
const Loggers = require('../utils/Logger');
const { createAdminNotification } = require('../utils/createAdminNotification');

// Run every minute
cron.schedule('* * * * *', async () => {
  try {
    console.log(`Cron: Instant win generation started...`);
    const competitions = await prisma.competition.findMany({
      where: {
        instantWinEnabled: true,
        instantWinGenerated: false,
        status: 1, // Active competitions
        deletedAt: null
      },
      include: {
        instantWinPrizes: true,
        _count: {
          select: { instantWins: true }
        }
      }
    });
    if (competitions.length === 0) {
      console.log(`Cron: No active competitions found with instant win generation enabled.`);
      return;
    }

    for (const comp of competitions) {
      console.log(`Cron: Processing competition ${comp.id}`);
      if (!comp.instantWinTriggerPercent) continue;

      const totalPrizes = comp.instantWinPrizes.reduce((sum, p) => sum + p.quantity, 0);

      // If all tickets already generated, skip
      if (comp._count.instantWins >= totalPrizes) {
        if (!comp.instantWinGenerated) {
          await prisma.competition.update({ where: { id: comp.id }, data: { instantWinGenerated: true } });
        }
        continue;
      }

      const thresholdTickets = Math.floor((comp.totalTickets * comp.instantWinTriggerPercent) / 100);

      if (comp.soldTickets >= thresholdTickets) {
        // Atomic update to prevent race conditions when running in cluster mode
        const updateResult = await prisma.competition.updateMany({
          where: {
            id: comp.id,
            instantWinGenerated: false
          },
          data: {
            instantWinGenerated: true
          }
        });

        if (updateResult.count === 0) {
          Loggers.info(`Cron: Instant wins already generated or being generated for comp ${comp.id}`);
          continue;
        }

        Loggers.info(`Cron: Threshold reached for competition ${comp.id}. Generating instant wins...`);
        console.log(`Cron: Threshold reached for competition ${comp.id}. Generating instant wins...`);

        // Pick numbers from soldTickets + 1 to totalTickets
        const startRange = comp.soldTickets + 1;
        const endRange = comp.totalTickets;

        if (totalPrizes > (endRange - startRange + 1)) {
          Loggers.error(`Cron: Not enough unsold tickets to assign instant wins for competition ${comp.id}`);
          console.log(`Cron: Not enough unsold tickets to assign instant wins for competition ${comp.id}`);
          // Rollback the generation flag
          await prisma.competition.update({
            where: { id: comp.id },
            data: { instantWinGenerated: false }
          });
          continue;
        }

        const winningNumbers = new Set();

        while (winningNumbers.size < totalPrizes) {
          const rand = Math.floor(Math.random() * (endRange - startRange + 1)) + startRange;
          winningNumbers.add(rand);
        }

        const numbersArray = Array.from(winningNumbers);
        let index = 0;

        try {
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
          });

          Loggers.info(`Cron: Instant wins generated successfully for competition ${comp.id}`);
          console.log(`Cron: Instant wins generated successfully for competition ${comp.id}`);
          await createAdminNotification({
            key: `instant-win-started-${comp.id}`,
            type: "instant_win_started",
            title: "Instant Win Started",
            message: `Instant wins are now active for ${comp.title}.`,
            meta: { competitionId: comp.id }
          });
        } catch (err) {
          Loggers.error(`Cron Error (InstantWin transaction): ${err.message}`);
          console.log(`Cron Error (InstantWin transaction): ${err.message}`);
          // Rollback the generation flag if transaction failed
          await prisma.competition.update({
            where: { id: comp.id },
            data: { instantWinGenerated: false }
          });
        }
      }
    }
  } catch (error) {
    Loggers.error(`Cron Error (InstantWin): ${error.message}`);
    console.log(`Cron Error (InstantWin): ${error.message}`);
  }
});
