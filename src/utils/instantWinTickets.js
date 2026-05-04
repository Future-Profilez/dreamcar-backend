const generateInstantWinTickets = async (tx, competition) => {
  const threshold = Math.floor(
    (competition.instantWinTriggerPercent / 100) * competition.totalTickets
  );

  if (
    !competition.instantWinEnabled ||
    competition.instantWinGenerated ||
    competition.soldTickets < threshold
  ) {
    return;
  }

  const prizeData = await tx.instantWinPrize.findMany({
    where: { competitionId: competition.id },
  });

  const totalPrizes = prizeData.reduce((sum, p) => sum + p.quantity, 0);

  const winningNumbers = new Set();

  const min = threshold + 1;
  const max = competition.totalTickets;

  // 🔥 IMPORTANT: prevent infinite loop
  if (totalPrizes > (max - min + 1)) {
    throw new Error("Too many instant win prizes for available ticket range");
  }

  while (winningNumbers.size < totalPrizes) {
    const rand = Math.floor(Math.random() * (max - min + 1)) + min;
    winningNumbers.add(rand);
  }

  const numbersArray = Array.from(winningNumbers);
  let index = 0;

  for (const prize of prizeData) {
    for (let i = 0; i < prize.quantity; i++) {
      await tx.instantWin.create({
        data: {
          competitionId: competition.id,
          prizeId: prize.id,
          ticketNumber: numbersArray[index++],
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