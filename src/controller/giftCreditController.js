const stripe = require("../utils/stripe");
const prisma = require("../prismaconfig");
const catchAsync = require("../utils/catchAsync");
const {
  successResponse,
  errorResponse,
} = require("../utils/ErrorHandling");

exports.purchaseGiftCredit = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return errorResponse(res, "Invalid amount", 200);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "gbp",

            product_data: {
              name: `DreamCar Gift Credit (£${amount})`,
            },

            unit_amount: amount * 100,
          },

          quantity: 1,
        },
      ],

      mode: "payment",

      success_url: `${process.env.FRONTEND_URL}/gift-success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${process.env.FRONTEND_URL}/gift-cancel`,

      metadata: {
        type: "gift_credit",
        userId: String(userId),
        amount: String(amount),
      },
    });

    return successResponse(
      res,
      "Gift credit checkout created",
      200,
      {
        url: session.url,
      }
    );
  } catch (error) {
    console.log("Purchase Gift Credit Error:", error);

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});