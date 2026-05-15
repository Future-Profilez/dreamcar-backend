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

exports.redeemGiftCredit = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return errorResponse(res, "Gift code is required", 200);
    }

    // 1. Find gift credit
    const giftCredit = await prisma.giftCredit.findUnique({
      where: {
        code: code.trim().toUpperCase()
      }
    });

    if (!giftCredit) {
      return errorResponse(res, "Invalid gift code", 200);
    }

    // 2. Already redeemed
    if (giftCredit.isRedeemed) {
      return errorResponse(res, "Gift code already redeemed", 200);
    }

    // 3. Expired
    if (
      giftCredit.expiresAt &&
      new Date(giftCredit.expiresAt) < new Date()
    ) {
      return errorResponse(res, "Gift code expired", 200);
    }

    // 4. Get/create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0
        }
      });
    }

    const newBalance =
      Number(wallet.balance) + Number(giftCredit.amount);

    // 5. Transaction
    await prisma.$transaction(async (tx) => {

      // update wallet
      await tx.wallet.update({
        where: {
          id: wallet.id
        },
        data: {
          balance: newBalance
        }
      });

      // wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: "credit",
          amount: giftCredit.amount,
          reason: `Gift credit redeemed (${giftCredit.code})`,
          balance: newBalance
        }
      });

      // mark redeemed
      await tx.giftCredit.update({
        where: {
          id: giftCredit.id
        },
        data: {
          isRedeemed: 1,
          redeemedById: userId,
          redeemedAt: new Date()
        }
      });

    });

    return successResponse(
      res,
      "Gift credit redeemed successfully",
      200,
      {
        amount: giftCredit.amount,
        balance: newBalance
      }
    );

  } catch (error) {

    console.log("Redeem Gift Credit Error:", error);

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});