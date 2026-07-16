const cron = require("node-cron");
const prisma = require("../prismaconfig");
const Loggers = require("../utils/Logger");
const { createAdminNotification } = require("../utils/createAdminNotification");

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const endedCompetitions = await prisma.competition.findMany({
      where: {
        deletedAt: null,
        endTime: { lte: now }
      },
      select: {
        id: true,
        title: true,
        instantWinEnabled: true
      }
    });

    for (const comp of endedCompetitions) {
      const created = await createAdminNotification({
        key: `competition-ended-${comp.id}`,
        type: "competition_ended",
        title: "Competition Ended",
        message: `${comp.title} has ended.`,
        meta: { competitionId: comp.id }
      });

      if (!created) continue;

      if (comp.instantWinEnabled) {
        const remaining = await prisma.instantWin.count({
          where: {
            competitionId: comp.id,
            isClaimed: false
          }
        });

        await createAdminNotification({
          key: `instant-win-ended-by-end-${comp.id}`,
          type: "instant_win_ended",
          title: "Instant Win Ended",
          message: remaining > 0
            ? `${comp.title} ended with ${remaining} unclaimed instant win prize(s).`
            : `${comp.title} ended and all instant win prizes were already claimed.`,
          meta: { competitionId: comp.id, remainingUnclaimed: remaining }
        });
      }
    }
  } catch (error) {
    Loggers.error(`Cron Error (CompetitionEnd): ${error.message}`);
  }
});
