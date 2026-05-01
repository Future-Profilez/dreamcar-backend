const stripe = require("../utils/stripe");
const prisma = require("../prismaconfig");

module.exports = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;


  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // ✅ Only handle successful checkout
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const {
        userId,
        items,
        type,
      } = session.metadata;

      if (type !== "competition_ticket") {
        return res.status(200).json({ received: true });
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
      // 🔥 Transaction (VERY IMPORTANT)
      await prisma.$transaction(async (tx) => {

          const parsedCompetitionId = parseInt(item.competitionId);
          const parsedQty = parseInt(item.quantity);
          const answer = item.answer;
          // ✅ 1. Create Payment Record
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

          // ✅ 2. Get competition (for ticket number logic)
          const competition = await tx.competition.findUnique({
            where: { id: parsedCompetitionId }
          });

          if (!competition) {
            throw new Error("Competition not found in webhook");
          }

          const question = await tx.complianceQuestion.findFirst({
            where: { competitionId: parsedCompetitionId }
          });

          const isCorrect = question?.answers?.includes(answer);
          // ✅ 3. Generate ticket numbers safely
          const startNumber = competition.soldTickets + 1;
          const ticketsData = [];

          for (let i = 0; i < parsedQty; i++) {
            const ticketNumber = startNumber + i;

            // ✅ Check if this ticket is a winning ticket
            const instantWin = await tx.instantWin.findUnique({
              where: {
                competitionId_ticketNumber: {
                  competitionId: parsedCompetitionId,
                  ticketNumber: ticketNumber,
                },
              },
            });

            let instantWinId = null;
            let isInstantWin = false;

            if (instantWin) {
              instantWinId = instantWin.id;
              isInstantWin = true;
            }

            ticketsData.push({
              userId: parsedUserId,
              competitionId: parsedCompetitionId,
              paymentId: payment.id,
              ticketNumber,
              isEligible: isCorrect,
              isInstantWin,
              instantWinId,
            });
          }

          // ✅ 4. Create tickets
          await tx.ticket.createMany({
            data: ticketsData
          });

          // ✅ 5. Claim instant wins automatically
          for (const ticket of ticketsData) {
            if (ticket.isInstantWin && ticket.instantWinId) {
              await tx.instantWin.update({
                where: { id: ticket.instantWinId },
                data: {
                  isClaimed: true,
                  claimedById: parsedUserId,
                  claimedAt: new Date(),
                },
              });
            }
          }

          // ✅ 6. Update sold tickets
          await tx.competition.update({
            where: { id: parsedCompetitionId },
            data: {
              soldTickets: {
                increment: parsedQty
              }
            }
          });

          // ✅ 7. CLEAR USER CART
          await tx.cartItem.deleteMany({
            where: {
              cart: {
                userId: parsedUserId
              }
            }
          });
        
      });
    }
  }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Webhook handler failed");
  }
};