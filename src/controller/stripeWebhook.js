const stripe = require("../utils/stripe");
const prisma = require("../prismaconfig");
const { processSuccessfulPayment, processWalletRecharge, processGiftCreditPayment } = require("../utils/paymentProcessor");

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
      switch (session.metadata.type) {
          case "competition_ticket":
            await processSuccessfulPayment(session);
              break;
          case "wallet_recharge":
              await processWalletRecharge(session);
              break;
          case "gift_credit":
              await processSuccessfulPayment(session);
              break;
          default:

      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Webhook handler failed");
  }
};