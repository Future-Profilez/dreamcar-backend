const cron = require('node-cron');
const prisma = require('../prismaconfig');
const Loggers = require('../utils/Logger');
const { createAdminNotification } = require('../utils/createAdminNotification');
const { mapPositionToTicket } = require('../utils/ticketNumber');

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
        instantWinPrizes: true,
        _count: {
          select: { instantWins: true }
        }
      }
    });
    if (competitions.length === 0) {

      return;
    }

    for (const comp of competitions) {

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

        // Pick instant wins in POSITION space (not number space) so only tickets not
        // yet sold can win, then map each position to its ticket number via the same
        // permutation used at purchase. This keeps fairness (already-sold positions
        // can't be picked) and guarantees each instant win will eventually be handed
        // to a real buyer. Positions are 0-indexed: [soldTickets, totalTickets).
        const startPos = comp.soldTickets;
        const endPos = comp.totalTickets;
        const availablePositions = endPos - startPos;

        if (totalPrizes > availablePositions) {
          Loggers.error(`Cron: Not enough unsold tickets to assign instant wins for competition ${comp.id}`);

          // Rollback the generation flag
          await prisma.competition.update({
            where: { id: comp.id },
            data: { instantWinGenerated: false }
          });
          continue;
        }

        const winningPositions = new Set();

        while (winningPositions.size < totalPrizes) {
          const rand = Math.floor(Math.random() * availablePositions) + startPos;
          winningPositions.add(rand);
        }

        const positionsArray = Array.from(winningPositions);
        let index = 0;

        try {
          await prisma.$transaction(async (tx) => {
            for (const prize of comp.instantWinPrizes) {
              for (let i = 0; i < prize?.quantity; i++) {
                const position = positionsArray[index++];
                const ticketNumber = comp.shuffleKey
                  ? mapPositionToTicket(position, comp.totalTickets, comp.shuffleKey)
                  : position + 1; // legacy fallback
                await tx.instantWin.create({
                  data: {
                    competitionId: comp.id,
                    prizeId: prize.id,
                    ticketNumber,
                    position
                  }
                });
              }
            }
          });

          Loggers.info(`Cron: Instant wins generated successfully for competition ${comp.id}`);

          await createAdminNotification({
            key: `instant-win-started-${comp.id}`,
            type: "instant_win_started",
            title: "Instant Win Started",
            message: `Instant wins are now active for ${comp.title}.`,
            meta: { competitionId: comp.id }
          });
        } catch (err) {
          Loggers.error(`Cron Error (InstantWin transaction): ${err.message}`);

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

  }
});
