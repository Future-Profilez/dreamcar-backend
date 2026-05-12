const stripe = require("../utils/stripe");
const prisma = require("../prismaconfig");
const { processSuccessfulPayment } = require("../utils/paymentProcessor");
const { processGiftCreditPayment } = require("../utils/giftCreditProcessor");

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
      if (session.metadata?.type === "gift_credit") {
        await processGiftCreditPayment(session);
      } else {
        await processSuccessfulPayment(session);
      }
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Webhook handler failed");
  }
};