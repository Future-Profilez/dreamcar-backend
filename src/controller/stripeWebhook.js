const stripe = require("../utils/stripe");
const prisma = require("../prismaconfig");
const { processSuccessfulPayment, processWalletRecharge, releaseReservationsForSession } = require("../utils/paymentProcessor");

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

    // Checkout abandoned/expired or payment failed -> release any inventory it held.
    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      await releaseReservationsForSession(session.id);

      if (event.type === "checkout.session.async_payment_failed") {
        try {
          const { trackEvent } = require("../utils/klaviyoService");
          const user = session.metadata?.userId
            ? await prisma.user.findUnique({ where: { id: parseInt(session.metadata.userId) } })
            : null;
          const email = session.customer_email || (user ? user.email : null);
          if (email) {
            trackEvent({
              metricName: "Payment Failed",
              profile: {
                email,
                ...(user ? { external_id: String(user.memberNumber || user.id), member_number: user.memberNumber || user.id } : {})
              },
              properties: {
                unique_id: `failed_${session.id}`,
                order_number: session.id,
                value: session.amount_total ? session.amount_total / 100 : 0,
                currency: "GBP",
                reason: "Payment failed or was declined"
              },
              value: session.amount_total ? session.amount_total / 100 : 0,
              uniqueId: `failed_${session.id}`
            });
          }
        } catch (klaviyoErr) {
          console.error("Klaviyo Payment Failed hook error:", klaviyoErr.message);
        }
      }
    }

    // Handle Refunded Orders
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const orderNumber = charge.payment_intent || charge.id;
      const refundValue = charge.amount_refunded ? charge.amount_refunded / 100 : 0;
      const email = charge.billing_details?.email || charge.receipt_email;
      if (email) {
        try {
          const { trackEvent } = require("../utils/klaviyoService");
          trackEvent({
            metricName: "Refunded Order",
            profile: { email },
            properties: {
              order_number: orderNumber,
              value: refundValue,
              reason: charge.refunds?.data?.[0]?.reason || "Order refunded"
            },
            value: refundValue,
            uniqueId: `refund_${charge.id}_${charge.amount_refunded}`
          });
        } catch (klaviyoErr) {
          console.error("Klaviyo Refunded Order hook error:", klaviyoErr.message);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Webhook handler failed");
  }
};