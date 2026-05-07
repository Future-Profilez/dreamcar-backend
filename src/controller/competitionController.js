const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const stripe = require('../utils/stripe');
const generateSlug = require('../utils/generateSlug');

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

    if (new Date(endTime) <= new Date(startTime)) {
      return errorResponse(res, "End time must be after start time", 200);
    }
    const files = req.files || {};

    if (
      !files.images ||
      files.images.length === 0 ||
      !files.prizeImages ||
      files.prizeImages.length === 0
    ) {
      return errorResponse(
        res,
        "All images are required (competition images, prize images)",
        200
      );
    }

    // ✅ Base URL
    const baseUrl = process.env.DOMAIN || "http://localhost:5003";

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
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        prizeDetail: mainPrize.prizeDescription,
        prizeDetailImage: mainPrizeImage,
        prizeFeatures: mainPrize.prizeFeatures || [],
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
                name: true
              }
            }
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

    const baseUrl = process.env.DOMAIN || "http://localhost:5003";

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

    // ✅ Time validation (only if both provided)
    if (startTime && endTime) {
      if (new Date(endTime) <= new Date(startTime)) {
        return errorResponse(res, "End time must be after start time", 400);
      }
    }

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
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
      prizeDetail: mainPrizeDetail,
      prizeFeatures: mainPrizeFeatures,
      prizeDetailImage: mainPrizeImage,
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