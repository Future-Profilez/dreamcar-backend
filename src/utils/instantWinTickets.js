const { mapPositionToTicket } = require("./ticketNumber");

const generateInstantWinTickets = async (tx, competition) => {
  const threshold = Math.floor(
    (competition.instantWinTriggerPercent / 100) * competition.totalTickets
  );

  const existingWinsCount = await tx.instantWin.count({
    where: { competitionId: competition.id }
  });

  const prizeData = await tx.instantWinPrize.findMany({
    where: { competitionId: competition.id },
  });

  const totalPrizes = prizeData.reduce((sum, p) => sum + p.quantity, 0);

  if (
    !competition.instantWinEnabled ||
    existingWinsCount >= totalPrizes ||
    competition.soldTickets < threshold
  ) {
    if (existingWinsCount >= totalPrizes && !competition.instantWinGenerated) {
      await tx.competition.update({
        where: { id: competition.id },
        data: { instantWinGenerated: true },
      });
    }
    return;
  }

  // Pick in POSITION space among not-yet-sold slots, then map to ticket numbers
  // via the competition's shuffleKey permutation (Option A). Positions are
  // 0-indexed: [soldTickets, totalTickets).
  const winningPositions = new Set();

  const startPos = competition.soldTickets;
  const endPos = competition.totalTickets;
  const availablePositions = endPos - startPos;

  // 🔥 IMPORTANT: prevent infinite loop
  if (totalPrizes > availablePositions) {
    throw new Error("Too many instant win prizes for available ticket range");
  }

  while (winningPositions.size < totalPrizes) {
    const rand = Math.floor(Math.random() * availablePositions) + startPos;
    winningPositions.add(rand);
  }

  const positionsArray = Array.from(winningPositions);
  let index = 0;

  for (const prize of prizeData) {
    for (let i = 0; i < prize.quantity; i++) {
      const position = positionsArray[index++];
      const ticketNumber = competition.shuffleKey
        ? mapPositionToTicket(position, competition.totalTickets, competition.shuffleKey)
        : position + 1; // legacy fallback
      await tx.instantWin.create({
        data: {
          competitionId: competition.id,
          prizeId: prize.id,
          ticketNumber,
          position,
        },
      });
    }
  }

  await tx.competition.update({
    where: { id: competition.id },
    data: { instantWinGenerated: true },
  });
};

module.exports = {
  generateInstantWinTickets,
};