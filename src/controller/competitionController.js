const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const stripe = require('../utils/stripe');

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
      prizeDetail,
      prizeFeatures,
      questions,
      instantWin
    } = req.body;

    if (
      !title ||
      !detail ||
      !ticketPrice ||
      !totalTickets ||
      !startTime ||
      !endTime ||
      !prizeDetail ||
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

    if (new Date(endTime) <= new Date(startTime)) {
      return errorResponse(res, "End time must be after start time", 200);
    }
    const files = req.files || {};


    if (
      !files.prizeDetailImage ||
      !files.images ||
      files.images.length === 0
    ) {
      return errorResponse(
        res,
        "All images are required (detailImage, prizeDetailImage)",
        200
      );
    }

    // ✅ Base URL
    const baseUrl = process.env.DOMAIN || "http://localhost:5003";

    // ✅ Add prefix while saving
    const prizeDetailImage = `${baseUrl}/uploads/${files.prizeDetailImage[0].filename}`;

    const images = files.images.map(
      (file) => `${baseUrl}/uploads/${file.filename}`
    );

    if (new Date(endTime) <= new Date(startTime)) {
      return errorResponse(res, "End time must be after start time", 200);
    }

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
    } catch (err) {
      return errorResponse(res, "Invalid questions JSON", 200);
    }

    let instantWinData = null;
    if (instantWin) {
      try {
        instantWinData = JSON.parse(instantWin);
      } catch (err) {
        return errorResponse(res, "Invalid instant win JSON", 400);
      }
    }

    const competition = await prisma.competition.create({
      data: {
        title,
        detail,
        productType,
        ticketPrice: parseInt(ticketPrice),
        totalTickets: parseInt(totalTickets),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        prizeDetail,
        prizeDetailImage,
        prizeFeatures: prizeFeatures ? JSON.parse(prizeFeatures) : [],
        images,

        instantWinEnabled: instantWinData?.enabled || false,
        instantWinTriggerPercent: instantWinData?.enabled
          ? parseInt(instantWinData.threshold)
          : null,
      },
    });

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

      for (let i = 0; i < instantWinData.prizes.length; i++) {
        const prize = instantWinData.prizes[i];

        let imageUrl = null;

        // handle image if uploaded
        if (files.instantWinImages && files.instantWinImages[i]) {
          imageUrl = `${baseUrl}/uploads/${files.instantWinImages[i].filename}`;
        }

        const createdPrize = await prisma.instantWinPrize.create({
          data: {
            competitionId: competition.id,
            title: prize.title,
            image: imageUrl,
            quantity: parseInt(prize.quantity || 1),
          },
        });

        createdPrizes.push(createdPrize);
      }
      //Generate winning tickets
      const thresholdTickets = Math.floor(
        (competition.totalTickets * instantWinData.threshold) / 100
      );

      const startRange = thresholdTickets + 1;
      const endRange = competition.totalTickets;

      let usedNumbers = new Set();

      for (const prize of createdPrizes) {
        for (let i = 0; i < prize.quantity; i++) {
          let num;

          do {
            num =
              Math.floor(Math.random() * (endRange - startRange + 1)) +
              startRange;
          } while (usedNumbers.has(num));

          usedNumbers.add(num);

          await prisma.instantWin.create({
            data: {
              competitionId: competition.id,
              prizeId: prize.id,
              ticketNumber: num,
            },
          });
        }
      }
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

exports.getAllCompetitions = catchAsync(async (req, res) => {
  try {
    const competitions = await prisma.competition.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return successResponse(
      res,
      competitions.length
        ? "Competitions fetched successfully"
        : "No competitions found",
      200,
      competitions
    );
  } catch (error) {
    console.log("Get Competitions Error:", error);
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.competitionDetail = catchAsync(async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const data = await prisma.competition.findFirst({
      where: {
        id,
        deletedAt: null,
      }, include: {
        questions: true,
      }

    });

    if (!data) {
      return errorResponse(res, "Competition not found", 200);
    }

    return successResponse(
      res,
      "Competition fetched successfully",
      200,
      data
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
      prizeDetail,
      prizeFeatures,
      // rules,
      questions,
    } = req.body;

    const files = req.files || {};

    const baseUrl = process.env.DOMAIN || "http://localhost:5003";

    // ✅ Handle optional image updates
    // let detailImage = existingCompetition.detailImage;
    // if (files.detailImage) {
    //   detailImage = `${baseUrl}/public/uploads/${files.detailImage[0].filename}`;
    // }

    let prizeDetailImage = existingCompetition.prizeDetailImage;
    if (files.prizeDetailImage) {
      prizeDetailImage = `${baseUrl}/uploads/${files.prizeDetailImage[0].filename}`;
    }

    // let rulesImage = existingCompetition.rulesImage;
    // if (files.rulesImage) {
    //   rulesImage = `${baseUrl}/uploads/${files.rulesImage[0].filename}`;
    // }

    const previousimages = existingCompetition.images;
    let images;
    if (files.images && files.images.length > 0) {
      images = files.images.map(
        (file) => `${baseUrl}/uploads/${file.filename}`
      );
    }

    if (images?.length) {
      images = [...previousimages, ...images]
    }

    // ✅ Time validation (only if both provided)
    if (startTime && endTime) {
      if (new Date(endTime) <= new Date(startTime)) {
        return errorResponse(res, "End time must be after start time", 400);
      }
    }

    // ✅ Build update object dynamically
    const updateData = {
      ...(title && { title }),
      ...(detail && { detail }),
      ...(productType && { productType }),
      ...(ticketPrice && { ticketPrice: parseInt(ticketPrice) }),
      ...(totalTickets && { totalTickets: parseInt(totalTickets) }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
      ...(prizeDetail && { prizeDetail }),
      ...(prizeFeatures && { prizeFeatures: JSON.parse(prizeFeatures) }),
      // ...(rules && { rules }),

      // images (always included because we fallback to existing)
      // detailImage,
      prizeDetailImage,
      // rulesImage,
      images,
    };

    const updatedCompetition = await prisma.competition.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

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
    const userId = req.user.id;
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Items are required", 200);
    }

    let totalAmount = 0;
    let lineItems = [];

    for (const item of items) {

      const { competitionId, quantity, answer } = item;

      if (!competitionId || !quantity) {
        return errorResponse(res, "competitionId and quantity are required", 200);
      }

      if (req.user.role !== "user") {
        return errorResponse(res, "Only users can buy tickets", 200);
      }

      if (quantity <= 0 || quantity > 10) {
        return errorResponse(res, "Invalid ticket quantity (max 10)", 200);
      }

      const competition = await prisma.competition.findUnique({
        where: { id: parseInt(competitionId) }
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
        return errorResponse(res, "Not enough tickets left", 200);
      }

      const existingTickets = await prisma.ticket.count({
        where: {
          userId,
          competitionId: parseInt(competitionId)
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