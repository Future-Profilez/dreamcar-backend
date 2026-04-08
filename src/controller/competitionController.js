const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");

exports.addCompetition = catchAsync(async (req, res) => {
  try {
    const {
      title,
      detail,
      ticketPrice,
      totalTickets,
      startTime,
      endTime,
      prizeDetail,
      prizeFeatures,
      rules,
    } = req.body;

    if (
      !title ||
      !detail ||
      !ticketPrice ||
      !totalTickets ||
      !startTime ||
      !endTime ||
      !prizeDetail ||
      !rules
    ) {
      return errorResponse(res, "All required fields must be provided", 400);
    }

    const files = req.files || {};

    // ✅ Mandatory image validation
    if (
      !files.detailImage ||
      !files.prizeDetailImage ||
      !files.rulesImage ||
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
    const baseUrl = process.env.domain ||  "http://localhost:8080";

    // ✅ Add prefix while saving
    const detailImage = `${baseUrl}/uploads/${files.detailImage[0].filename}`;
    const prizeDetailImage = `${baseUrl}/uploads/${files.prizeDetailImage[0].filename}`;
    const rulesImage = `${baseUrl}/uploads/${files.rulesImage[0].filename}`;

    const images = files.images.map(
      (file) => `${baseUrl}/public/${file.filename}`
    );

    if (new Date(endTime) <= new Date(startTime)) {
      return errorResponse(res, "End time must be after start time", 400);
    }

    const competition = await prisma.competition.create({
      data: {
        title,
        detail,
        detailImage,
        ticketPrice: parseInt(ticketPrice),
        totalTickets: parseInt(totalTickets),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        prizeDetail,
        prizeDetailImage,
        prizeFeatures,
        rules,
        rulesImage,
        images,
      },
    });

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