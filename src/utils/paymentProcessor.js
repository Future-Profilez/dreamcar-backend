const prisma = require("../prismaconfig");
const { generateTicketCode } = require("./ticketCode");

const processWalletRecharge = async (session) => {
    const { userId, amount, type } = session.metadata;

    if (type !== "wallet_recharge") {
        return;
    }

    const parsedUserId = parseInt(userId);
    const parsedAmount = parseFloat(amount);

    if (!parsedUserId || !parsedAmount) {
        throw new Error("Invalid wallet recharge metadata");
    }

    await prisma.$transaction(async (tx) => {

        // Prevent duplicate processing
        const existingTransaction = await tx.walletTransaction.findFirst({
            where: {
                stripePaymentId: session.payment_intent
            }
        });

        if (existingTransaction) {
            return;
        }

        // Create payment record
        const payment = await tx.stripePayment.create({
            data: {
                userId: parsedUserId,
                amount: parsedAmount,
                currency: session.currency?.toUpperCase() || "USD",
                status: "success",
                type: "wallet_recharge",
                stripePaymentId: session.payment_intent,
                sessionId: session.id,
            }
        });

        // Get or create wallet
        let wallet = await tx.wallet.findUnique({
            where: {
                userId: parsedUserId
            }
        });

        if (!wallet) {
            wallet = await tx.wallet.create({
                data: {
                    userId: parsedUserId,
                    balance: 0
                }
            });
        }

        // Update wallet balance
        const updatedWallet = await tx.wallet.update({
            where: {
                id: wallet.id
            },
            data: {
                balance: {
                    increment: parsedAmount
                }
            }
        });

        // Create wallet transaction
        await tx.walletTransaction.create({
            data: {
                walletId: wallet.id,
                userId: parsedUserId,
                type: "credit",
                amount: parsedAmount,
                balance: updatedWallet.balance,
                reason: "Wallet recharge via Stripe",
                stripePaymentId: payment.id
            }
        });

    });
};

const processSuccessfulPayment = async (session) => {
    const { userId, items, type } = session.metadata;
    
    if (type !== "competition_ticket") {
        return;
    }

    const parsedUserId = parseInt(userId);
    let parsedItems = [];

    try {
        parsedItems = items ? JSON.parse(items) : [];
    } catch (e) {
        console.error("JSON parse error:", items);
        throw new Error("Invalid metadata items");
    }

    for (const item of parsedItems) {
        await prisma.$transaction(async (tx) => {
            const parsedCompetitionId = parseInt(item.competitionId);
            const parsedQty = parseInt(item.quantity);
            const answer = item.answer;

            // Lock the competition row to prevent race conditions (double processing)
            await tx.$executeRaw`SELECT id FROM "Competition" WHERE id = ${parsedCompetitionId} FOR UPDATE`;

            // Check if payment already exists to prevent duplicate processing
            const existingPayment = await tx.stripePayment.findFirst({
                where: { sessionId: session.id, competitionId: parsedCompetitionId }
            });

            if (existingPayment) {
                return; // Already processed
            }

            // 1. Create Payment Record
            const payment = await tx.stripePayment.create({
                data: {
                    userId: parsedUserId,
                    competitionId: parsedCompetitionId,
                    amount: session.amount_total / 100,
                    currency: session.currency,
                    status: "success",
                    type: "competition",
                    stripePaymentId: session.payment_intent,
                    sessionId: session.id,
                    quantity: parsedQty
                }
            });

            // 2. Get competition
            const competition = await tx.competition.findUnique({
                where: { id: parsedCompetitionId },
                select: { id: true, soldTickets: true } // use select to lock or just read
            });

            if (!competition) {
                throw new Error("Competition not found");
            }

            // 3. Check Answer
            const question = await tx.complianceQuestion.findFirst({
                where: { competitionId: parsedCompetitionId }
            });

            const isCorrect = question?.answers?.includes(answer);

            // 4. UPDATE SOLD TICKETS FIRST
            const updatedCompetition = await tx.competition.update({
                where: { id: parsedCompetitionId },
                data: {
                    soldTickets: {
                        increment: parsedQty
                    }
                }
            });

            // 5. Generate ticket numbers safely + check wins
            const startNumber = updatedCompetition.soldTickets - parsedQty + 1;
            const ticketsData = [];
            const instantWinUpdates = [];

            // Pre-fetch all potential instant wins for these ticket numbers to avoid querying in loop
            const potentialWins = await tx.instantWin.findMany({
                where: {
                    competitionId: parsedCompetitionId,
                    ticketNumber: {
                        gte: startNumber,
                        lt: startNumber + parsedQty
                    }
                }
            });

            const instantWinsMap = new Map(
                potentialWins.map(w => [w.ticketNumber, w])
            );

            for (let i = 0; i < parsedQty; i++) {
                const ticketNumber = startNumber + i;

                const instantWin = instantWinsMap.get(ticketNumber);

                let isInstantWin = false;

                if (instantWin && !instantWin.isClaimed) {
                    isInstantWin = true;
                    instantWinUpdates.push({ id: instantWin.id });
                }

                ticketsData.push({
                    userId: parsedUserId,
                    competitionId: parsedCompetitionId,
                    paymentId: payment.id,
                    ticketNumber,
                    ticketCode: generateTicketCode(parsedCompetitionId, ticketNumber),
                    isEligible: isCorrect,
                    isInstantWin,
                });
            }

            // 6. Create tickets
            await tx.ticket.createMany({
                data: ticketsData
            });

            // 7. Claim instant wins
            for (const win of instantWinUpdates) {
                await tx.instantWin.update({
                    where: { id: win.id },
                    data: {
                        isClaimed: true,
                        claimedById: parsedUserId,
                        claimedAt: new Date(),
                    },
                });
            }
        });
    }

    // 8. CLEAR USER CART
    try {
        const userCart = await prisma.cart.findUnique({
            where: { userId: parsedUserId }
        });
        if (userCart) {
            await prisma.cartItem.deleteMany({
                where: { cartId: userCart.id }
            });
        }
    } catch (err) {
        console.error("Failed to clear cart:", err);
    }
};

function generateGiftCode() {
  return (
    "DRM-" +
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

const processGiftCreditPayment = async (session) => {
  const userId = Number(session.metadata.userId);

  const amount = Number(session.metadata.amount);

  await prisma.giftCredit.create({
    data: {
      code: generateGiftCode(),

      amount,

      purchasedById: userId,

      expiresAt: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ),
    },
  });
};

module.exports = { processSuccessfulPayment, processWalletRecharge, processGiftCreditPayment };