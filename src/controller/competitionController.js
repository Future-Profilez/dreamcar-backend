const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const stripe = require('../utils/stripe');
const generateSlug = require('../utils/generateSlug');
const { createAdminNotification } = require("../utils/createAdminNotification");
const parseLondonDateTime = require("../utils/parseLondonDateTime");

exports.addCompetition = catchAsync(async (req, res) => {
  try {
    const {
      title,
      detail,
      productType,
      ticketPrice,
      totalTickets,
      startTime,
      endTime,
      questions,
      instantWin,
      prizes // Added prizes array (JSON string)
    } = req.body;

    if (
      !title ||
      !detail ||
      !ticketPrice ||
      !totalTickets ||
      !startTime ||
      !endTime ||
      !prizes ||
      !questions
    ) {
      return errorResponse(res, "All required fields must be provided", 200);
    }

    if (isNaN(ticketPrice) || Number(ticketPrice) <= 0) {
      return errorResponse(res, "Invalid ticket price", 200);
    }

    if (isNaN(totalTickets) || Number(totalTickets) <= 0) {
      return errorResponse(res, "Invalid total tickets", 200);
    }

    const parsedStartTime = parseLondonDateTime(startTime);
    const parsedEndTime = parseLondonDateTime(endTime, { endOfDay: true });

    if (!parsedStartTime || !parsedEndTime) {
      return errorResponse(res, "Invalid start/end time", 200);
    }

    if (parsedEndTime <= parsedStartTime) {
      return errorResponse(res, "End time must be after start time", 200);
    }
    const files = req.files || {};

    if (!files.images || files.images.length === 0) {
      return errorResponse(res, "Competition images are required", 200);
    }

    // ✅ Base URL
    const baseUrl = (process.env.BACKEND_PUBLIC_URL || process.env.DOMAIN || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

    const images = files.images.map(
      (file) => `${baseUrl}/uploads/${file.filename}`
    );

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
    } catch (err) {
      return errorResponse(res, "Invalid questions JSON", 200);
    }

    let parsedPrizes;
    try {
      parsedPrizes = JSON.parse(prizes);
      if (!Array.isArray(parsedPrizes) || parsedPrizes.length === 0) {
        return errorResponse(res, "At least one prize must be provided", 200);
      }
    } catch (err) {
      return errorResponse(res, "Invalid prizes JSON", 200);
    }

    let instantWinData = null;
    if (instantWin) {
      try {
        instantWinData = JSON.parse(instantWin);
      } catch (err) {
        return errorResponse(res, "Invalid instant win JSON", 400);
      }
    }

    const mainPrize = parsedPrizes[0];
    const mainPrizeImage = files.prizeImages && files.prizeImages[0]
      ? `${baseUrl}/uploads/${files.prizeImages[0].filename}`
      : "";

    const slug = generateSlug(title, mainPrize.title || mainPrize.prizeDescription);

    const competition = await prisma.competition.create({
      data: {
        title,
        slug,
        detail,
        productType,
        ticketPrice: parseInt(ticketPrice),
        totalTickets: parseInt(totalTickets),
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        // prizeDetail: mainPrize.prizeDescription,
        // prizeDetailImage: mainPrizeImage,
        // prizeFeatures: mainPrize.prizeFeatures || [],
        images,
        instantWinEnabled: instantWinData?.enabled || false,
        instantWinTriggerPercent: instantWinData?.enabled
          ? parseInt(instantWinData.threshold)
          : null,
      },
    });

    for (let i = 0; i < parsedPrizes.length; i++) {
      const p = parsedPrizes[i];
      let pImage = "";
      // Match the image by index
      if (files.prizeImages && files.prizeImages[i]) {
        pImage = `${baseUrl}/uploads/${files.prizeImages[i].filename}`;
      }

      await prisma.prize.create({
        data: {
          competitionId: competition.id,
          title: p.title,
          prizeDetail: p.prizeDescription,
          prizeDetailImage: pImage,
          prizeFeatures: p.prizeFeatures || [],
          position: i + 1, // 1 for winner, 2 for runner-up 1, etc.
        }
      });
    }

    for (const q of parsedQuestions) {
      if (!q.question || !q.options || !q.answer) continue;

      const createdQuestion = await prisma.complianceQuestion.create({
        data: {
          question: q.question,
          competitionId: competition.id,
          options: q.options,
          answers: [q.answer]
        }
      });
    }

    if (instantWinData?.enabled) {
      if (!instantWinData.threshold || !instantWinData.prizes?.length) {
        return errorResponse(res, "Invalid instant win configuration", 200);
      }
      if (!instantWinData.threshold) {
        return errorResponse(res, "Instant win threshold required", 200);
      }

      if (!instantWinData.prizes?.length) {
        return errorResponse(res, "At least one instant prize required", 200);
      }

      // Save Instant prizes
      const createdPrizes = [];

      // Group identical prizes by name to calculate quantity
      const prizeCounts = {};
      const prizeImages = {};

      for (let i = 0; i < instantWinData.prizes.length; i++) {
        const prize = instantWinData.prizes[i];
        const title = prize.title?.trim();

        if (!title) continue;

        let imageUrl = null;

        // handle image if uploaded
        if (files.instantWinImages && files.instantWinImages[i]) {
          imageUrl = `${baseUrl}/uploads/${files.instantWinImages[i].filename}`;
        }

        if (prizeCounts[title]) {
          prizeCounts[title] += 1;
          if (!prizeImages[title] && imageUrl) {
            prizeImages[title] = imageUrl;
          }
        } else {
          prizeCounts[title] = 1;
          prizeImages[title] = imageUrl;
        }
      }

      for (const [title, quantity] of Object.entries(prizeCounts)) {
        const createdPrize = await prisma.instantWinPrize.create({
          data: {
            competitionId: competition.id,
            title: title,
            image: prizeImages[title] || null,
            quantity: quantity,
          },
        });

        createdPrizes.push(createdPrize);
      }
    }

    try {
      await createAdminNotification({
        key: `competition-created-${competition.id}`,
        type: "competition_created",
        title: "New Competition",
        message: `${competition.title} created successfully.`,
        meta: { competitionId: competition.id }
      });

      if (competition.instantWinEnabled) {
        await createAdminNotification({
          key: `instant-win-enabled-${competition.id}`,
          type: "instant_win_enabled",
          title: "Instant Win Enabled",
          message: `Instant win has been enabled for ${competition.title}.`,
          meta: { competitionId: competition.id }
        });
      }
    } catch (notifyErr) {
    }

    return successResponse(
      res,
      "Competition created successfully",
      201,
      competition
    );
  } catch (error) {
    console.log("Add Competition Error:", error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

// exports.getAllCompetitions = catchAsync(async (req, res) => {
//   try {
//     const competitions = await prisma.competition.findMany({
//       where: {
//         deletedAt: null,
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });

//     return successResponse(
//       res,
//       competitions.length
//         ? "Competitions fetched successfully"
//         : "No competitions found",
//       200,
//       competitions
//     );
//   } catch (error) {
//     console.log("Get Competitions Error:", error);
//     return errorResponse(
//       res,
//       error.message || "Internal Server Error",
//       500
//     );
//   }
// });

exports.getAllCompetitions = catchAsync(async (req, res) => {
  try {

    const {
      search,
      status,
      instantWin,
      sort,
      type
    } = req.query;

    let where = {
      deletedAt: null
    };

    if (type) {
      where.productType = type;
    }
    if (search) {

      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          slug: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    // STATUS
    const now = new Date();

    if (status === "live") {

      where.startTime = { lte: now };
      where.endTime = { gte: now };

    } else if (status === "ended") {

      where.endTime = { lt: now };

    } else if (status === "upcoming") {

      where.startTime = { gt: now };
    }

    // INSTANT WIN
    if (instantWin === "enabled") {

      where.instantWinEnabled = true;

    } else if (instantWin === "disabled") {

      where.instantWinEnabled = false;
    }

    // SORT
    let orderBy = {
      createdAt: "desc"
    };

    if (sort === "oldest") {

      orderBy = {
        createdAt: "asc"
      };

    } else if (sort === "sold") {

      orderBy = {
        soldTickets: "desc"
      };
    }

    const competitions =
      await prisma.competition.findMany({
        where,
        orderBy,
        include: {

          results: {

            where: {
              position: 1
            },

            select: {
              id: true,
              position: true
            }
          },

          winnerDetail: {

            select: {
              id: true
            }
          }
        }
      });

    return successResponse(
      res,
      "Competitions fetched successfully",
      200,
      competitions
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.competitionDetail = catchAsync(async (req, res) => {
  try {
    const identifier = req.params.id;
    let whereCondition = { deletedAt: null };

    if (!isNaN(identifier)) {
      whereCondition.id = parseInt(identifier);
    } else {
      whereCondition.slug = identifier;
    }

    const data = await prisma.competition.findFirst({
      where: whereCondition,
      include: {
        questions: true,
        prizes: {
          orderBy: { position: 'asc' }
        },
        instantWinPrizes: true,
        instantWins: {
          include: {
            prize: true,
            claimedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        results: {
          include: {
            user: true
          }
        }
      }

    });

    if (!data) {
      return errorResponse(res, "Competition not found", 200);
    }

    let thresholdReached = false;
    if (data.instantWinEnabled && data.instantWinTriggerPercent) {
      const thresholdTickets = Math.floor((data.totalTickets * data.instantWinTriggerPercent) / 100);
      thresholdReached = data.soldTickets >= thresholdTickets;
    }

    const responseData = {
      ...data,
      thresholdReached
    };

    return successResponse(
      res,
      "Competition fetched successfully",
      200,
      responseData
    );
  } catch (error) {
    console.log("Get Competition detail Error:", error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.updateCompetition = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, "Competition ID is required", 400);
    }

    const existingCompetition = await prisma.competition.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingCompetition) {
      return errorResponse(res, "Competition not found", 404);
    }

    const {
      title,
      detail,
      productType,
      ticketPrice,
      totalTickets,
      startTime,
      endTime,
      prizes,
      existingImages,
      // rules,
      questions,
      instantWin,
    } = req.body;

    const files = req.files || {};

    const baseUrl = (process.env.BACKEND_PUBLIC_URL || process.env.DOMAIN || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

    let parsedPrizes;
    if (prizes) {
      try {
        parsedPrizes = JSON.parse(prizes);
      } catch (err) {
        return errorResponse(res, "Invalid prizes JSON", 400);
      }
    }

    let instantWinData = null;
    if (instantWin) {
      try {
        instantWinData = JSON.parse(instantWin);
      } catch (err) {
        return errorResponse(res, "Invalid instant win JSON", 400);
      }
    }

    // Reconstruct the images array
    // existingImages can be undefined, string, or array of strings
    let finalImages = [];
    if (existingImages) {
      if (Array.isArray(existingImages)) {
        finalImages = [...existingImages];
      } else {
        finalImages = [existingImages];
      }
    }

    if (files.images && files.images.length > 0) {
      const newImages = files.images.map(
        (file) => `${baseUrl}/uploads/${file.filename}`
      );
      finalImages = [...finalImages, ...newImages];
    }

    const parsedStartTime = startTime ? parseLondonDateTime(startTime) : null;
    const parsedEndTime = endTime ? parseLondonDateTime(endTime, { endOfDay: true }) : null;

    // if (startTime && !parsedStartTime) {
    //   return errorResponse(res, "Invalid start time", 400);
    // }

    // if (endTime && !parsedEndTime) {
    //   return errorResponse(res, "Invalid end time", 400);
    // }

    // if (parsedStartTime && parsedEndTime && parsedEndTime <= parsedStartTime) {
    //   return errorResponse(res, "End time must be after start time", 400);
    // }

    if (totalTickets && parseInt(totalTickets) !== existingCompetition.totalTickets) {
      if (existingCompetition.instantWinEnabled && existingCompetition.soldTickets > 0) {
        return errorResponse(res, "Cannot change total tickets after tickets have been sold in an instant win competition.", 200);
      }
    }

    let mainPrizeDetail = existingCompetition.prizeDetail;
    let mainPrizeImage = existingCompetition.prizeDetailImage;
    let mainPrizeFeatures = existingCompetition.prizeFeatures;
    let mainPrizeTitle = "";

    if (parsedPrizes && parsedPrizes.length > 0) {
      const mainPrize = parsedPrizes[0];
      mainPrizeTitle = mainPrize.title || mainPrize.prizeDescription;
      mainPrizeDetail = mainPrize.prizeDescription;
      mainPrizeFeatures = mainPrize.prizeFeatures || [];
      if (mainPrize.hasNewImage && files.prizeImages && files.prizeImages[0]) {
        mainPrizeImage = `${baseUrl}/uploads/${files.prizeImages[0].filename}`;
      } else if (mainPrize.existingImage) {
        mainPrizeImage = mainPrize.existingImage;
      }
    }

    let finalSlug = existingCompetition.slug;
    if (!finalSlug) {
      finalSlug = generateSlug(title || existingCompetition.title, mainPrizeTitle || existingCompetition.prizeDetail);
    }

    // ✅ Build update object dynamically
    const updateData = {
      ...(title && { title }),
      slug: finalSlug,
      ...(detail && { detail }),
      ...(productType && { productType }),
      ...(ticketPrice && { ticketPrice: parseInt(ticketPrice) }),
      ...(totalTickets && { totalTickets: parseInt(totalTickets) }),
      ...(parsedStartTime && { startTime: parsedStartTime }),
      ...(parsedEndTime && { endTime: parsedEndTime }),
      // prizeDetail: mainPrizeDetail,
      // prizeFeatures: mainPrizeFeatures,
      // prizeDetailImage: mainPrizeImage,
      images: finalImages,
      ...(instantWinData && {
        instantWinEnabled: instantWinData.enabled,
        instantWinTriggerPercent: instantWinData.enabled ? parseInt(instantWinData.threshold) : null,
      })
    };

    const updatedCompetition = await prisma.competition.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    if (instantWinData) {
      try {
        if (!existingCompetition.instantWinEnabled && updatedCompetition.instantWinEnabled) {
          await createAdminNotification({
            key: `instant-win-enabled-${updatedCompetition.id}`,
            type: "instant_win_enabled",
            title: "Instant Win Enabled",
            message: `Instant win has been enabled for ${updatedCompetition.title}.`,
            meta: { competitionId: updatedCompetition.id }
          });
        }
        if (existingCompetition.instantWinEnabled && !updatedCompetition.instantWinEnabled) {
          await createAdminNotification({
            key: `instant-win-disabled-${updatedCompetition.id}`,
            type: "instant_win_disabled",
            title: "Instant Win Disabled",
            message: `Instant win has been disabled for ${updatedCompetition.title}.`,
            meta: { competitionId: updatedCompetition.id }
          });
        }
      } catch (notifyErr) {
      }
    }

    if (parsedPrizes) {
      await prisma.prize.deleteMany({
        where: { competitionId: parseInt(id) }
      });

      let newImageIndex = 0;
      for (let i = 0; i < parsedPrizes.length; i++) {
        const p = parsedPrizes[i];
        let pImage = p.existingImage || "";
        if (p.hasNewImage && files.prizeImages && files.prizeImages[newImageIndex]) {
          pImage = `${baseUrl}/uploads/${files.prizeImages[newImageIndex].filename}`;
          newImageIndex++;
        }

        await prisma.prize.create({
          data: {
            competitionId: parseInt(id),
            title: p.title,
            prizeDetail: p.prizeDescription,
            prizeDetailImage: pImage,
            prizeFeatures: p.prizeFeatures || [],
            position: i + 1,
          }
        });
      }
    }

    if (questions) {
      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(questions);
      } catch (err) {
        return errorResponse(res, "Invalid questions JSON", 400);
      }

      await prisma.complianceQuestion.deleteMany({
        where: { competitionId: parseInt(id) }
      });

      for (const q of parsedQuestions) {
        if (!q.question || !q.options || !q.answer) continue;

        await prisma.complianceQuestion.create({
          data: {
            question: q.question,
            competitionId: parseInt(id),
            options: q.options,
            answers: [q.answer]
          }
        });
      }
    }

    if (instantWinData?.enabled && !existingCompetition.instantWinGenerated) {
      if (!instantWinData.threshold || !instantWinData.prizes?.length) {
        return errorResponse(res, "Invalid instant win configuration", 200);
      }

      // Delete existing prizes only if they haven't been generated yet
      await prisma.instantWinPrize.deleteMany({
        where: { competitionId: parseInt(id) }
      });

      // Group identical prizes by name to calculate quantity
      const prizeCounts = {};
      const prizeImages = {};

      for (let i = 0; i < instantWinData.prizes.length; i++) {
        const prize = instantWinData.prizes[i];
        const title = prize.title.trim();

        if (!title) continue;

        let imageUrl = prize.existingImage || null;
        if (prize.hasNewImage && files.instantWinImages && files.instantWinImages[i]) {
          imageUrl = `${baseUrl}/uploads/${files.instantWinImages[i].filename}`;
        }

        if (prizeCounts[title]) {
          prizeCounts[title] += 1;
          // Keep the first image uploaded for this title
          if (!prizeImages[title] && imageUrl) {
            prizeImages[title] = imageUrl;
          }
        } else {
          prizeCounts[title] = 1;
          prizeImages[title] = imageUrl;
        }
      }

      for (const [title, quantity] of Object.entries(prizeCounts)) {
        await prisma.instantWinPrize.create({
          data: {
            competitionId: parseInt(id),
            title: title,
            image: prizeImages[title] || null,
            quantity: quantity,
          },
        });
      }
    }

    return successResponse(
      res,
      "Competition updated successfully",
      200,
      updatedCompetition
    );
  } catch (error) {
    console.log("Update Competition Error:", error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.createCompetitionPayment = catchAsync(async (req, res) => {
  try {
    const isWalletPayment = req.body.isWalletPayment;
    const userId = req.user.id;
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Items are required", 200);
    }
    let totalAmount = 0;
    let lineItems = [];
    for (const item of items) {

      const { competitionId, quantity, answer, itemType, itemId } = item;

      //for gift credit
      if (itemType === "gift_credit") {

        const amount = Number(itemId);

        if (!amount || amount <= 0) {
          return errorResponse(
            res,
            "Invalid gift credit amount",
            200
          );
        }

        totalAmount += amount;

        lineItems.push({
          price_data: {
            currency: "usd",

            product_data: {
              name:
                `DreamCar Gift Credit (£${amount})`
            },

            unit_amount: Math.round(amount * 100)
          },

          quantity: 1
        });

        continue;
      }

      if (!itemId || !quantity) {
        return errorResponse(res, "competitionId and quantity are required", 200);
      }

      if (req.user.role !== "user") {
        return errorResponse(res, "Only users can buy tickets", 200);
      }

      if (quantity <= 0 || quantity > 10) {
        return errorResponse(res, "Invalid ticket quantity (max 10)", 200);
      }

      const competition = await prisma.competition.findUnique({
        where: { id: parseInt(itemId) }
      });

      if (!competition) {
        return errorResponse(res, "Competition not found", 200);
      }

      const now = new Date();

      if (competition.endTime <= now) {
        return errorResponse(res, "Competition has ended", 200);
      }

      if (competition.startTime > now) {
        return errorResponse(res, "Competition not started yet", 200);
      }

      if (competition.soldTickets + quantity > competition.totalTickets) {
        const available = competition.totalTickets - competition.soldTickets;
        return errorResponse(res, `Not enough tickets left for ${competition.title}. Only ${available} available.`, 200);
      }

      const existingTickets = await prisma.ticket.count({
        where: {
          userId,
          competitionId: parseInt(itemId)
        }
      });

      if (existingTickets + quantity > 10) {
        return errorResponse(res, "Ticket limit exceeded (max 10 per user)", 200);
      }

      const amount = competition.ticketPrice * quantity;
      totalAmount += amount;
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${competition.title} - ${quantity} Ticket(s)`
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      });
    }
    if (isWalletPayment) {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: req.user.id },
      });

      if (!wallet || Number(wallet.balance) < Number(totalAmount)) {
        return errorResponse(res, "Insufficient Wallet Balance.", 200);
      }

      const remainingBalance = Number(wallet.balance) - Number(totalAmount);

      const mockSessionId = "wallet_sess_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
      const mockPaymentIntent = "wallet_pi_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);

      const sessionObj = {
        id: mockSessionId,
        payment_intent: mockPaymentIntent,
        currency: "usd",
        metadata: {
          userId: userId.toString(),
          type: "competition_ticket",
          items: JSON.stringify(items)
        }
      };

      try {
        // Deduct balance
        const updatedWallet = await prisma.wallet.update({
          where: { userId: req.user.id },
          data: { balance: remainingBalance }
        });

        // Create transaction record
        const transaction = await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: userId,
            type: "debit",
            amount: totalAmount,
            balance: updatedWallet.balance,
            reason: "Purchased items from cart"
          }
        });

        try {
          const { processSuccessfulPayment } = require("../utils/paymentProcessor");
          await processSuccessfulPayment(sessionObj);
        } catch (processErr) {
          console.error("Ticket processing failed after wallet deduction. Refunding wallet...", processErr);

          // Refund wallet
          const refundedWallet = await prisma.wallet.update({
            where: { userId: req.user.id },
            data: { balance: { increment: totalAmount } }
          });

          // Log refund transaction
          await prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: userId,
              type: "credit",
              amount: totalAmount,
              balance: refundedWallet.balance,
              reason: "Refund due to failed cart processing"
            }
          });

          throw processErr; // Re-throw to be caught by outer catch
        }

        return successResponse(res, "Payment successful", 200, {
          url: `${process.env.FRONTEND_URL}/ticket/payment/success?session_id=${mockSessionId}`
        });

      } catch (err) {
        console.error("Wallet payment processing failed:", err);
        // We could implement rollback here if needed
        return errorResponse(res, "Payment processing failed. Please contact support.", 500);
      }

    } else {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: req.user.email,

        line_items: lineItems,
        success_url: `${process.env.FRONTEND_URL}/ticket/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/ticket/payment/cancel`,

        metadata: {
          userId: userId.toString(),
          type: "competition_ticket",
          items: JSON.stringify(items)
        }
      });
      return successResponse(res, "Session created", 200, {
        url: session.url
      });
    }
  } catch (error) {
    console.error("Create Payment Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.deleteCompetition = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, "Competition ID is required", 200);
    }
    const competition = await prisma.competition.findUnique({
      where: { id: parseInt(id) },
    });
    if (!competition) {
      return errorResponse(res, "Competition not found", 200);
    }
    await prisma.competition.update({
      where: { id: parseInt(id) },
      data: {
        deletedAt: new Date(),
      },
    });
    return successResponse(res, "Competition deleted successfully", 200);
  } catch (error) {
    console.log("Delete Competition Error:", error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.getCurrencyRates = catchAsync(async (req, res) => {
  try {
    const rates = await prisma.currencyRate.findMany();
    const rateMap = {};
    rates.forEach(r => {
      rateMap[r.currency] = r.rate;
    });
    // Add default GBP rate just in case
    if (!rateMap['GBP']) rateMap['GBP'] = 1;
    if (!rateMap['EUR']) rateMap['EUR'] = 1.17;
    if (!rateMap['USD']) rateMap['USD'] = 1.25;

    return successResponse(res, "Currency rates fetched successfully", 200, rateMap);
  } catch (error) {
    console.error("Fetch Currency Rates Error:", error);
    // Return fallback rates if DB fails
    return successResponse(res, "Fallback currency rates returned", 200, {
      GBP: 1,
      EUR: 1.17,
      USD: 1.25
    });
  }
});

exports.triggerCompetitionUpdates = catchAsync(async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return errorResponse(res, "Unauthorized", 403);
    }

    const { processCompetitionUpdates } = require("../cron/competitionUpdatesCron");
    const result = await processCompetitionUpdates();

    return successResponse(res, result.message || "Manual trigger executed successfully", 200, result);
  } catch (error) {
    console.error("Manual Trigger Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.syncCurrencyRates = catchAsync(async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return errorResponse(res, "Unauthorized", 403);
    }

    const response = await fetch('https://open.er-api.com/v6/latest/GBP');
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.rates) {
      throw new Error('Rates payload missing');
    }

    const currencies = ['GBP', 'EUR', 'USD'];
    for (const currency of currencies) {
      const rate = data.rates[currency];
      if (typeof rate === 'number' && Number.isFinite(rate)) {
        await prisma.currencyRate.upsert({
          where: { currency },
          update: { rate },
          create: { currency, rate }
        });
      }
    }

    const updatedRates = await prisma.currencyRate.findMany();
    const formattedRates = {};
    updatedRates.forEach(r => {
      formattedRates[r.currency] = r.rate;
    });

    return successResponse(res, "Currency rates synchronized successfully", 200, formattedRates);
  } catch (error) {
    console.error("Sync Currency Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getDashboardData = catchAsync(async (req, res) => {

  // RECENT DATA
  const recentCompetitions =
    await prisma.competition.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc"
      }
    });

  const recentPayments =
    await prisma.stripePayment.findMany({
      take: 5,
      include: {
        user: true,
        competition: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

  const recentResults =
    await prisma.result.findMany({
      take: 5,
      include: {
        user: true,
        competition: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

  // DASHBOARD STATS
  const [
    totalUsers,
    totalTickets,
    activeCompetitions,
    allPayments
  ] = await Promise.all([

    prisma.user.count({
      where: {
        role: {
          not: "admin"
        }
      }
    }),

    prisma.ticket.count(),

    prisma.competition.count({
      where: {
        endTime: {
          gte: new Date()
        }
      }
    }),

    prisma.stripePayment.findMany({
      where: {
        status: "success"
      },
      select: {
        amount: true
      }
    })

  ]);

  // TOTAL REVENUE
  const totalRevenue =
    allPayments.reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    );

  // BUILD ACTIVITY ARRAY
  const activities = [

    // COMPETITIONS
    ...recentCompetitions.map(item => ({
      id: `competition-${item.id}`,
      type: "competition_created",
      title: item.title,
      description: "Competition created",
      status: "live",
      createdAt: item.createdAt
    })),

    // PAYMENTS
    ...recentPayments.map(item => ({
      id: `payment-${item.id}`,
      type: "payment",
      title: item.user?.name || "User",
      description:
        `Purchased ${item.competition?.title || "Gift Credit"
        }`,
      amount: item.amount,
      createdAt: item.createdAt,
      status: item.status
    })),

    // WINNERS
    ...recentResults.map(item => ({
      id: `winner-${item.id}`,
      type: "winner",
      title: item.user?.name || "Winner",
      description:
        `Won ${item.competition?.title}`,
      position: item.position,
      createdAt: item.createdAt,
      status: "winner"
    }))
  ];

  // SORT ACTIVITIES
  activities.sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  );

  return successResponse(
    res,
    "Dashboard data fetched",
    200,
    {
      stats: {
        totalRevenue,
        activeCompetitions,
        totalTickets,
        totalUsers
      },

      latestCompetitions: recentCompetitions,

      recentActivity:
        activities.slice(0, 10)
    }
  );
});

exports.toggleFeaturedCompetition = catchAsync(async (req, res) => {
  const { id } = req.params;
  const competition =
    await prisma.competition.findUnique({
      where: {
        id: parseInt(id)
      }
    });

  if (!competition) {
    return errorResponse(
      res,
      "Competition not found",
      404
    );
  }

  const updated =
    await prisma.competition.update({
      where: {
        id: parseInt(id)
      },
      data: {
        isFeatured: competition.isFeatured === 1 ? 0 : 1
      }
    });

  return successResponse(
    res,
    updated.featured
      ? "Competition featured"
      : "Competition unfeatured",
    200,
    updated
  );
});

exports.getSimilarCompetitions =
  catchAsync(async (req, res) => {

    const { id } = req.params;

    const currentCompetition =
      await prisma.competition.findUnique({
        where: {
          id: parseInt(id)
        }
      });

    if (!currentCompetition) {
      return errorResponse(
        res,
        "Competition not found",
        404
      );
    }

    // SAME CATEGORY
    let competitions =
      await prisma.competition.findMany({
        where: {
          deletedAt: null,
          id: {
            not: currentCompetition.id
          },
          productType:
            currentCompetition.productType
        },

        orderBy: [
          {
            isFeatured: "desc"
          },
          {
            createdAt: "desc"
          }
        ],

        take: 6
      });

    // FALLBACK
    if (competitions.length < 6) {

      const extra =
        await prisma.competition.findMany({
          where: {
            deletedAt: null,
            id: {
              notIn: [
                currentCompetition.id,
                ...competitions.map(c => c.id)
              ]
            }
          },

          orderBy: {
            createdAt: "desc"
          },

          take: 6 - competitions.length
        });

      competitions = [
        ...competitions,
        ...extra
      ];
    }

    return successResponse(
      res,
      "Similar competitions fetched",
      200,
      competitions
    );
  });

exports.getAllInstantWinsAdmin = catchAsync(async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return errorResponse(res, "Unauthorized", 403);
    }

    const instantWins = await prisma.instantWin.findMany({
      include: {
        competition: {
          select: {
            id: true,
            title: true,
            endTime: true
          }
        },
        prize: {
          select: {
            title: true,
            image: true
          }
        },
        claimedBy: {
          select: {
            name: true,
            email: true
          }
        },
        ticket: {
          select: {
            ticketCode: true
          }
        }
      },
      orderBy: {
        claimedAt: "desc" // Unclaimed will be null, they will go to the end or we can sort by id
      }
    });

    // Map to flat structure for easier table rendering
    const formatted = instantWins.map(iw => ({
      id: iw.id,
      competitionTitle: iw.competition.title,
      competitionId: iw.competition.id,
      prizeTitle: iw.prize.title,
      prizeImage: iw.prize.image,
      ticketNumber: iw.ticketNumber,
      ticketCode: iw.ticket?.ticketCode || null,
      isClaimed: iw.isClaimed,
      claimedBy: iw.claimedBy?.name || null,
      claimedByEmail: iw.claimedBy?.email || null,
      claimedAt: iw.claimedAt
    }));

    return successResponse(res, "Instant wins fetched successfully", 200, formatted);
  } catch (error) {
    console.error("Get Admin Instant Wins Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getLiveDraws = catchAsync(async (req, res) => {


  const now = new Date();

  const competitions =
    await prisma.competition.findMany({
      where: {
        deletedAt: null,
        endTime: {
          gte: now
        }
      },

      orderBy: {
        endTime: "asc"
      },

      select: {
        id: true,
        title: true,
        slug: true,
        images: true,
        soldTickets: true,
        totalTickets: true,
        endTime: true,

        prizes: {
          orderBy: {
            position: "asc"
          },
          select: {
            id: true,
            title: true,
            position: true
          }
        },

        instantWinPrizes: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

  const data = competitions.map((item) => {

    const mainPrize =
      item.prizes.find(
        (p) => p.position === 1
      );

    const runnerUpPrizes =
      item.prizes
        .filter((p) => p.position > 1)
        .map((p) => p.title);

    const instantWinTitles =
      item.instantWinPrizes.map(
        (p) => p.title
      );

    const allPrizes = [];

    // MAIN PRIZE
    if (mainPrize) {

      allPrizes.push({
        title: mainPrize.title,
        type: "main"
      });

    }

    // RUNNER UPS
    if (runnerUpPrizes.length > 0) {

      allPrizes.push({
        title:
          runnerUpPrizes.join(", "),
        type: "runner_up"
      });

    }

    // INSTANT WINS
    if (instantWinTitles.length > 0) {

      allPrizes.push({
        title:
          instantWinTitles.join(", "),
        type: "instant_win"
      });

    }

    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      image: item.images?.[0],

      drawDate: item.endTime,

      drawTime:
        item.endTime.toLocaleTimeString(
          "en-GB",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        ),

      soldPercentage:
        item.totalTickets > 0
          ? Math.round(
            (item.soldTickets / item.totalTickets) * 100
          )
          : 0,

      prizes: allPrizes
    };

  });

  return successResponse(
    res,
    "Live draws fetched successfully",
    200,
    data
  );


});
