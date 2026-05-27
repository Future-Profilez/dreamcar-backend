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
    const { amount, giftType, recipientEmail, competitionName } = req.body;
    console.log("AMOUNTTT : ",amount);
    if (!amount || amount <= 0) {
      return errorResponse(res, "Invalid amount", 200);
    }

    const metadata = {
      type: "gift_credit",
      userId: String(userId),
      amount: String(amount),
      giftType: giftType || "custom",
    };

    if (recipientEmail) metadata.recipientEmail = recipientEmail;
    if (competitionName) metadata.competitionName = competitionName;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "gbp",

            product_data: {
              name: giftType === "competition" && competitionName
                ? `Gift Ticket: ${competitionName}`
                : `DreamCar Gift Credit (£${amount})`,
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
        ...metadata,
        items: JSON.stringify([
          {
            itemType: "gift_credit",
            itemId: amount,
            quantity: 1
          }
        ])
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

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

// exports.getAllGiftCredits = catchAsync(async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.query;
//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     let where = {};
//     if (search) {
//       where = {
//         code: { contains: search, mode: "insensitive" }
//       };
//     }

//     const [items, total] = await Promise.all([
//       prisma.giftCredit.findMany({
//         where,
//         include: {
//           purchasedByUser: { select: { id: true, name: true, email: true } },
//           redeemedByUser: { select: { id: true, name: true, email: true } },
//         },
//         orderBy: { createdAt: "desc" },
//         skip,
//         take: parseInt(limit),
//       }),
//       prisma.giftCredit.count({ where }),
//     ]);

//     return successResponse(res, "Gift credits fetched", 200, {
//       items,
//       totalPages: Math.ceil(total / parseInt(limit)),
//       currentPage: parseInt(page),
//       totalItems: total
//     });
//   } catch (error) {
//     return errorResponse(res, error.message || "Internal Server Error", 500);
//   }
// });

exports.getAllGiftCredits = catchAsync(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sort,
     
    } = req.query;

    const skip =
      (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    // SEARCH
    if (search) {

      where.OR = [

        {
          code: {
            contains: search,
            mode: "insensitive"
          }
        },

        {
          purchasedByUser: {
            is: {
              name: {
                contains: search,
                mode: "insensitive"
              }
            }
          }
        },

        {
          purchasedByUser: {
            is: {
              email: {
                contains: search,
                mode: "insensitive"
              }
            }
          }
        }

      ];
    }

    // STATUS
    if (status === "redeemed") {
      where.isRedeemed = 1;
    } else if (status === "active") {
      where.isRedeemed = 0;
    } else if (status === "expired") {
      where.expiresAt = {
        lt: new Date()
      };
    }

 

    // SORT
    let orderBy = {
      createdAt: "desc"
    };

    if (sort === "oldest") {
      orderBy = {
        createdAt: "asc"
      };
    } else if (sort === "highest") {
      orderBy = {
        amount: "desc"
      };
    } else if (sort === "lowest") {
      orderBy = {
        amount: "asc"
      };
    }

    const [items, total, allCredits] =
      await Promise.all([
        prisma.giftCredit.findMany({
          where,
          include: {
            purchasedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },

            redeemedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },

          },
          orderBy,
          skip,
          take: parseInt(limit),
        }),
        prisma.giftCredit.count({ where }),
        prisma.giftCredit.findMany()
      ]);

    // STATS
    const totalRevenue =
      allCredits.reduce(
        (sum, item) => sum + Number(item.amount),
        0
      );

    const redeemedRevenue =
      allCredits
        .filter(item => item.isRedeemed)
        .reduce(
          (sum, item) => sum + Number(item.amount),
          0
        );

    const activeRevenue =
      allCredits
        .filter(item => !item.isRedeemed)
        .reduce(
          (sum, item) => sum + Number(item.amount),
          0
        );

    return successResponse(
      res,
      "Gift credits fetched",
      200,
      {
        items,
        stats: {
          totalRevenue,
          redeemedRevenue,
          activeRevenue,
          totalCredits: allCredits.length,
          redeemedCount:
            allCredits.filter(i => i.isRedeemed).length,
          activeCount:
            allCredits.filter(i => !i.isRedeemed).length
        },

        totalPages:
          Math.ceil(total / parseInt(limit)),
        currentPage:
          parseInt(page),
        totalItems:
          total
      }
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.myGiftCredits = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await prisma.giftCredit.findMany({
      where: {
        OR: [{ purchasedById: userId }, { redeemedById: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        redeemedByUser: { select: { id: true, name: true, email: true } },
      }
    });
    return successResponse(res, "My gift credits fetched", 200, items);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});