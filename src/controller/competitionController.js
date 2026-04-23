const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");

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
      // rules,
      questions
    } = req.body;

    if (
      !title ||
      !detail ||
      // !productType ||
      !ticketPrice ||
      !totalTickets ||
      !startTime ||
      !endTime ||
      !prizeDetail ||
      // !rules
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
      // !files.detailImage ||
      !files.prizeDetailImage ||
      // !files.rulesImage ||
      !files.images ||
      files.images.length === 0
    ) {
      return errorResponse(
        res,
        "All images are required (detailImage, prizeDetailImage, rulesImage, images)",
        400
      );
    }

    // ✅ Base URL
    const baseUrl = process.env.DOMAIN || "http://localhost:8080";

    // ✅ Add prefix while saving
    const prizeDetailImage = `${baseUrl}/uploads/${files.prizeDetailImage[0].filename}`;

    const images = files.images.map(
      (file) => `${baseUrl}/uploads/${file.filename}`
    );

    if (new Date(endTime) <= new Date(startTime)) {
      return errorResponse(res, "End time must be after start time", 400);
    }

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
    } catch (err) {
      return errorResponse(res, "Invalid questions JSON", 400);
    }

    const competition = await prisma.competition.create({
      data: {
        title,
        detail,
        // detailImage,
        productType,
        ticketPrice: parseInt(ticketPrice),
        totalTickets: parseInt(totalTickets),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        prizeDetail,
        prizeDetailImage,
        prizeFeatures: prizeFeatures ? JSON.parse(prizeFeatures) : [],
        // rules,
        // rulesImage,
        images,
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

    const data = await prisma.competition.findUnique({
      where: { id },
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

    // ✅ Find existing competition
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

    const baseUrl = process.env.DOMAIN || "http://localhost:8080";

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

    let images = existingCompetition.images;
    if (files.images && files.images.length > 0) {
      images = files.images.map(
        (file) => `${baseUrl}/uploads/${file.filename}`
      );
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
        where: { competitionId }
      });

      for (const q of parsedQuestions) {
        if (!q.question || !q.options || !q.answer) continue;

        await prisma.complianceQuestion.create({
          data: {
            question: q.question,
            competitionId,
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

    const { competitionId, quantity } = req.body;

    if (!competitionId || !quantity) {
      return errorResponse(res, "competitionId and quantity are required", 400);
    }

    if (quantity <= 0 || quantity > 10) {
      return errorResponse(res, "Invalid ticket quantity (max 10)", 400);
    }

    const competition = await prisma.competition.findUnique({
      where: { id: parseInt(competitionId) }
    });

    if (!competition) {
      return errorResponse(res, "Competition not found", 404);
    }

    const now = new Date();

    if (competition.endTime <= now) {
      return errorResponse(res, "Competition has ended", 400);
    }

    if (competition.startTime > now) {
      return errorResponse(res, "Competition not started yet", 400);
    }

    if (competition.soldTickets + quantity > competition.totalTickets) {
      return errorResponse(res, "Not enough tickets left", 400);
    }

    const existingTickets = await prisma.ticket.count({
      where: {
        userId,
        competitionId: parseInt(competitionId)
      }
    });

    if (existingTickets + quantity > 10) {
      return errorResponse(res, "Ticket limit exceeded (max 10 per user)", 400);
    }

    const amount = competition.ticketPrice * quantity;
    const amountInCents = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: req.user.email,

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${competition.title} - ${quantity} Ticket(s)`
            },
            unit_amount: amountInCents
          },
          quantity: 1
        }
      ],

      success_url: `${process.env.DOMAIN}/payment-success`,
      cancel_url: `${process.env.DOMAIN}/payment-cancel`,

      metadata: {
        userId: userId.toString(),
        competitionId: competitionId.toString(),
        quantity: quantity.toString(),
        type: "competition_ticket"
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