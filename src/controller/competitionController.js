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
    } = req.body;

    if (
      !title ||
      !detail ||
      // !productType ||
      !ticketPrice ||
      !totalTickets ||
      !startTime ||
      !endTime ||
      !prizeDetail
      // ||
      // !rules
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
    const baseUrl = process.env.domain || "http://localhost:8080";

    // ✅ Add prefix while saving
    // const detailImage = `${baseUrl}/uploads/${files.detailImage[0].filename}`;
    const prizeDetailImage = `${baseUrl}/uploads/${files.prizeDetailImage[0].filename}`;
    // const rulesImage = `${baseUrl}/uploads/${files.rulesImage[0].filename}`;

    const images = files.images.map(
      (file) => `${baseUrl}/public/${file.filename}`
    );

    if (new Date(endTime) <= new Date(startTime)) {
      return errorResponse(res, "End time must be after start time", 400);
    }

    const competition = await prisma.Competition.create({
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
    const competitions = await prisma.Competition.findMany({
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

    const data = await prisma.Competition.findUnique({
      where: { id },
    });

    if (!data) {
      return errorResponse(res, "Competition not found", 404);
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
    const existingCompetition = await prisma.Competition.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingCompetition) {
      return errorResponse(res, "Competition not found", 404);
    }

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

    const files = req.files || {};

    const baseUrl = process.env.domain || "http://localhost:8080";

    // ✅ Handle optional image updates
    let detailImage = existingCompetition.detailImage;
    if (files.detailImage) {
      detailImage = `${baseUrl}/uploads/${files.detailImage[0].filename}`;
    }

    let prizeDetailImage = existingCompetition.prizeDetailImage;
    if (files.prizeDetailImage) {
      prizeDetailImage = `${baseUrl}/uploads/${files.prizeDetailImage[0].filename}`;
    }

    let rulesImage = existingCompetition.rulesImage;
    if (files.rulesImage) {
      rulesImage = `${baseUrl}/uploads/${files.rulesImage[0].filename}`;
    }

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
      ...(ticketPrice && { ticketPrice: parseInt(ticketPrice) }),
      ...(totalTickets && { totalTickets: parseInt(totalTickets) }),
      ...(startTime && { startTime: new Date(startTime) }),
      ...(endTime && { endTime: new Date(endTime) }),
      ...(prizeDetail && { prizeDetail }),
      ...(prizeFeatures && { prizeFeatures }),
      ...(rules && { rules }),

      // images (always included because we fallback to existing)
      detailImage,
      prizeDetailImage,
      rulesImage,
      images,
    };

    const updatedCompetition = await prisma.Competition.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

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



