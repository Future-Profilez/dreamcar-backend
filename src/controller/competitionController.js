const crypto = require("crypto");
const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const stripe = require('../utils/stripe');
const generateSlug = require('../utils/generateSlug');
const { createAdminNotification } = require("../utils/createAdminNotification");
const parseLondonDateTime = require("../utils/parseLondonDateTime");
const {
  getCompetitionTicketDiscountPercent,
} = require("../utils/ticketDiscount");
const { getActiveReservedTickets } = require("./cartController");


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

    // Upper bound: prevents memory exhaustion in the instant-win number generator
    // (Set fill loop) when an unreasonably large totalTickets is submitted.
    if (Number(totalTickets) > 10000000) {
      return errorResponse(res, "Total tickets exceeds the allowed maximum (10,000,000)", 200);
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
        ticketPrice: Number(ticketPrice),
        totalTickets: parseInt(totalTickets),
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        // secret key for random ticket-number allocation (Option A permutation)
        shuffleKey: crypto.randomBytes(16).toString("hex"),
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

    // Dynamic content sections (admin-managed detail blocks)
    if (req.body.contentSections) {
      let parsedSections;
      try {
        parsedSections = JSON.parse(req.body.contentSections);
      } catch (err) {
        return errorResponse(res, "Invalid content sections JSON", 200);
      }
      if (Array.isArray(parsedSections)) {
        let secImgIdx = 0;
        let secVidIdx = 0;
        for (let i = 0; i < parsedSections.length; i++) {
          const s = parsedSections[i] || {};
          if (!s.title || !s.description) continue;

          let image = null;
          if (s.hasNewImage && files.sectionImages && files.sectionImages[secImgIdx]) {
            image = `${baseUrl}/uploads/${files.sectionImages[secImgIdx].filename}`;
            secImgIdx++;
          }

          let video = null;
          if (s.hasNewVideo && files.sectionVideos && files.sectionVideos[secVidIdx]) {
            video = `${baseUrl}/uploads/${files.sectionVideos[secVidIdx].filename}`;
            secVidIdx++;
          } else if (s.videoUrl && s.videoUrl.trim()) {
            video = s.videoUrl.trim();
          }

          const specs = Array.isArray(s.specs)
            ? s.specs.map((x) => String(x).slice(0, 60)).filter((x) => x.trim())
            : [];

          await prisma.contentSection.create({
            data: {
              competitionId: competition.id,
              title: s.title,
              description: s.description,
              image,
              video,
              specs,
              position: i + 1,
            },
          });
        }
      }
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

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

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

    // if (status === "live") {

    //   where.startTime = { lte: now };
    //   where.endTime = { gte: now };

    //   // Exclude sold out competitions
    //   where.NOT = {
    //     soldTickets: {
    //       gte: prisma.competition.fields.totalTickets
    //     }
    //   };

    // } else if (status === "ended") {

    //   where.OR = [
    //     {
    //       endTime: {
    //         lt: now
    //       }
    //     },
    //     {
    //       AND: [
    //         {
    //           soldTickets: {
    //             gt: 0
    //           }
    //         }
    //       ]
    //     }
    //   ];

    // } else if (status === "upcoming") {

    //   where.startTime = { gt: now };
    // }

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

    let competitions =
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
          },

          instantWins: true,
          instantWinPrizes: true
        }
      });

    if (status === "live") {
      competitions = competitions.filter(
        (item) =>
          new Date(item.startTime) <= now &&
          new Date(item.endTime) >= now &&
          item.soldTickets < item.totalTickets
      );
    }

    if (status === "ended") {
      competitions = competitions.filter(
        (item) =>
          new Date(item.endTime) < now ||
          item.soldTickets >= item.totalTickets
      );
    }

    if (status === "upcoming") {
      competitions = competitions.filter(
        (item) =>
          new Date(item.startTime) > now
      );
    }

    // if (status === "live") {
    //   competitions = competitions.filter(
    //     (item) => item.soldTickets < item.totalTickets
    //   );
    // }

    return successResponse(
      res,
      "Competitions fetched successfully",
      200,
      competitions
    );

  } catch (error) {

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
        contentSections: {
          where: { deletedAt: null },
          orderBy: { position: 'desc' } // newest-first on detail page
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

    const activeReserved = await getActiveReservedTickets(data.id);

    const responseData = {
      ...data,
      activeReservedTickets: activeReserved,
      thresholdReached
    };


    return successResponse(
      res,
      "Competition fetched successfully",
      200,
      responseData
    );
  } catch (error) {

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

    console.log("ticketPrice received:", ticketPrice);

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

    // Random ticket-number allocation (Option A) maps each position -> number using
    // totalTickets (N) as the domain size. Changing N after any ticket is sold/reserved
    // would produce a different permutation for new purchases, colliding with numbers
    // already issued under the old N. So lock totalTickets once sales/reservations start.
    if (totalTickets && parseInt(totalTickets) !== existingCompetition.totalTickets) {
      if (existingCompetition.soldTickets > 0 || existingCompetition.reservedTickets > 0) {
        return errorResponse(res, "Cannot change total tickets after tickets have been sold or reserved.", 200);
      }
    }

    if (
      ticketPrice !== undefined &&
      ticketPrice !== null &&
      ticketPrice !== ""
    ) {
      if (isNaN(Number(ticketPrice))) {
        return errorResponse(
          res,
          "Ticket price must be a valid number.",
          200
        );
      }

      if (Number(ticketPrice) <= 0) {
        return errorResponse(
          res,
          "Ticket price must be greater than 0.",
          200
        );
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
      // ...(ticketPrice && { ticketPrice: parseInt(ticketPrice) }),
      ...(ticketPrice !== undefined &&
        ticketPrice !== null &&
        ticketPrice !== "" && {
        ticketPrice: Number(ticketPrice)
      }),
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


    console.log("updateData:", updateData);

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

    // Dynamic content sections — replace strategy (only when payload sent)
    if (req.body.contentSections !== undefined) {
      let parsedSections = [];
      if (req.body.contentSections) {
        try {
          parsedSections = JSON.parse(req.body.contentSections);
        } catch (err) {
          return errorResponse(res, "Invalid content sections JSON", 400);
        }
      }

      await prisma.contentSection.deleteMany({
        where: { competitionId: parseInt(id) },
      });

      if (Array.isArray(parsedSections)) {
        let secImgIdx = 0;
        let secVidIdx = 0;
        for (let i = 0; i < parsedSections.length; i++) {
          const s = parsedSections[i] || {};
          if (!s.title || !s.description) continue;

          let image = s.existingImage || null;
          if (s.hasNewImage && files.sectionImages && files.sectionImages[secImgIdx]) {
            image = `${baseUrl}/uploads/${files.sectionImages[secImgIdx].filename}`;
            secImgIdx++;
          }

          let video = s.existingVideo || null;
          if (s.hasNewVideo && files.sectionVideos && files.sectionVideos[secVidIdx]) {
            video = `${baseUrl}/uploads/${files.sectionVideos[secVidIdx].filename}`;
            secVidIdx++;
          } else if (s.videoUrl !== undefined) {
            video = s.videoUrl && s.videoUrl.trim() ? s.videoUrl.trim() : (s.existingVideo || null);
          }

          const specs = Array.isArray(s.specs)
            ? s.specs.map((x) => String(x).slice(0, 60)).filter((x) => x.trim())
            : [];

          await prisma.contentSection.create({
            data: {
              competitionId: parseInt(id),
              title: s.title,
              description: s.description,
              image,
              video,
              specs,
              position: i + 1,
            },
          });
        }
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

    return errorResponse(
      res,
      error.message || "Internal Server Error",
      500
    );
  }
});

exports.createCompetitionPayment = catchAsync(async (req, res) => {
  try {
    if (!req.user || !req.user.phone || !req.user.phone.trim()) {
      return errorResponse(res, "Phone number is required to proceed with payment. Please update your profile.", 200);
    }
    const isWalletPayment = req.body.isWalletPayment;
    const userId = req.user.id;
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "Items are required", 200);
    }
    let lineItems = [];
    const pricedItems = new Array(items.length);
    const ticketPricing = [];
    let giftSubtotalCents = 0;
    let ticketSubtotalCents = 0;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
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

        const amountCents = Math.round(amount * 100);
        giftSubtotalCents += amountCents;

        lineItems.push({
          price_data: {
            currency: "gbp",

            product_data: {
              name:
                `DreamCar Gift Credit (£${amount})`
            },

            unit_amount: amountCents
          },

          quantity: 1
        });

        pricedItems[idx] = {
          ...item,
          finalAmountCents: amountCents,
        };

        continue;
      }

      const parsedQty = parseInt(quantity, 10);
      if (!itemId || !Number.isInteger(parsedQty) || parsedQty <= 0) {
        return errorResponse(res, "competitionId and quantity are required", 200);
      }

      if (req.user.role !== "user") {
        return errorResponse(res, "Only users can buy tickets", 200);
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

      // Best-effort pre-check
      const activeReservedOthers = await getActiveReservedTickets(competition.id, userId);
      const available = competition.totalTickets - competition.soldTickets - activeReservedOthers;

      if (parsedQty > available) {
        const totalUnsold = competition.totalTickets - competition.soldTickets;
        if (activeReservedOthers > 0 && totalUnsold >= parsedQty) {
          return errorResponse(res, "High Demand! Someone is currently holding these tickets. Check back shortly!", 200);
        }
        return errorResponse(res, `Not enough tickets left for ${competition.title}. Only ${Math.max(0, available)} available.`, 200);
      }


      const subtotalCents = Math.round(Number(competition.ticketPrice) * 100) * parsedQty;
      ticketSubtotalCents += subtotalCents;

      const discountPercent = getCompetitionTicketDiscountPercent(parsedQty);
      const discountCents = Math.round(subtotalCents * discountPercent);
      const finalCents = Math.max(0, subtotalCents - discountCents);

      ticketPricing.push({
        idx,
        item,
        competition,
        parsedQty,
        subtotalCents,
        finalCents,
      });
    }

    let discountedTicketTotalCents = 0;
    for (let i = 0; i < ticketPricing.length; i++) {
      const t = ticketPricing[i];
      discountedTicketTotalCents += t.finalCents;

      lineItems.push({
        price_data: {
          currency: "gbp",
          product_data: {
            name: `${t.competition.title} - ${t.parsedQty} Ticket(s)`,
          },
          unit_amount: t.finalCents,
        },
        quantity: 1,
      });

      pricedItems[t.idx] = {
        ...t.item,
        quantity: t.parsedQty,
        finalAmountCents: t.finalCents,
      };
    }

    const pricedItemsForMetadata = pricedItems.filter(Boolean);
    const totalAmount = (giftSubtotalCents + discountedTicketTotalCents) / 100;

    const RESERVATION_TTL_MS = 35 * 60 * 1000; // 35 min (>= Stripe's 30-min minimum expires_at, with buffer)

    // Atomically reserve inventory for every competition in this purchase.
    // The guarded UPDATE only succeeds while real availability remains, so concurrent
    // buyers (card OR wallet) can never oversell. Returns the per-competition amounts
    // reserved so the caller can roll them back on any later failure.
    const reserveInventory = async () => {
      const reserved = [];
      for (const t of ticketPricing) {
        const affected = await prisma.$executeRaw`
          UPDATE "Competition"
          SET "reservedTickets" = "reservedTickets" + ${t.parsedQty}
          WHERE id = ${t.competition.id}
            AND "totalTickets" - "soldTickets" - "reservedTickets" >= ${t.parsedQty}`;
        if (affected === 0) {
          // Roll back whatever we already reserved in this loop, then signal sold-out.
          await releaseInventory(reserved);
          const err = new Error(`Not enough tickets left for ${t.competition.title}.`);
          err.soldOut = true;
          throw err;
        }
        reserved.push({ competitionId: t.competition.id, qty: t.parsedQty });
      }
      return reserved;
    };

    const releaseInventory = async (reserved) => {
      for (const r of reserved) {
        await prisma.$executeRaw`
          UPDATE "Competition" SET "reservedTickets" = "reservedTickets" - ${r.qty} WHERE id = ${r.competitionId}`;
      }
    };

    if (isWalletPayment) {
      // 1. Reserve inventory (so wallet buys can't oversell either).
      let reserved;
      try {
        reserved = await reserveInventory();
      } catch (reserveErr) {
        if (reserveErr.soldOut) return errorResponse(res, reserveErr.message, 200);
        throw reserveErr;
      }

      // 2. Atomic, race-safe wallet deduction (only succeeds if balance still sufficient).
      const deduct = await prisma.wallet.updateMany({
        where: { userId: req.user.id, balance: { gte: totalAmount } },
        data: { balance: { decrement: totalAmount } }
      });

      if (deduct.count === 0) {
        await releaseInventory(reserved);
        return errorResponse(res, "Insufficient Wallet Balance.", 200);
      }

      const wallet = await prisma.wallet.findUnique({
        where: { userId: req.user.id },
      });

      const mockSessionId = "wallet_sess_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
      const mockPaymentIntent = "wallet_pi_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);

      // 3. Persist reservation rows so processSuccessfulPayment converts reserved -> sold.
      await prisma.ticketReservation.createMany({
        data: reserved.map(r => ({
          sessionId: mockSessionId,
          competitionId: r.competitionId,
          userId,
          quantity: r.qty,
          status: "reserved",
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS)
        }))
      });

      const sessionObj = {
        id: mockSessionId,
        payment_intent: mockPaymentIntent,
        currency: "gbp",
        metadata: {
          userId: userId.toString(),
          type: "competition_ticket",
          items: JSON.stringify(pricedItemsForMetadata)
        }
      };

      try {
        // Create transaction record (balance already decremented atomically above)
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: userId,
            type: "debit",
            amount: totalAmount,
            balance: wallet.balance,
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

          // Release any still-reserved inventory for this mock session
          const { releaseReservationsForSession } = require("../utils/paymentProcessor");
          await releaseReservationsForSession(mockSessionId);

          throw processErr; // Re-throw to be caught by outer catch
        }

        return successResponse(res, "Payment successful", 200, {
          url: `${process.env.FRONTEND_URL}/ticket/payment/success?session_id=${mockSessionId}`
        });

      } catch (err) {
        console.error("Wallet payment processing failed:", err);
        return errorResponse(res, "Payment processing failed. Please contact support.", 500);
      }

    } else {
      // Card flow: reserve inventory BEFORE handing out a checkout URL.
      let reserved;
      try {
        reserved = await reserveInventory();
      } catch (reserveErr) {
        if (reserveErr.soldOut) return errorResponse(res, reserveErr.message, 200);
        throw reserveErr;
      }

      const expiresAtUnix = Math.floor(Date.now() / 1000) + Math.floor(RESERVATION_TTL_MS / 1000);

      let session;
      try {
        session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          customer_email: req.user.email,
          expires_at: expiresAtUnix,

          line_items: lineItems,
          success_url: `${process.env.FRONTEND_URL}/ticket/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/ticket/payment/cancel`,

          metadata: {
            userId: userId.toString(),
            type: "competition_ticket",
            items: JSON.stringify(pricedItemsForMetadata)
          }
        });
      } catch (stripeErr) {
        // Stripe failed — free the reserved inventory so it isn't leaked.
        await releaseInventory(reserved);
        throw stripeErr;
      }

      // Persist reservation rows keyed by the real session id (webhook/cron use these
      // to confirm on success or release on expiry).
      try {
        await prisma.ticketReservation.createMany({
          data: reserved.map(r => ({
            sessionId: session.id,
            competitionId: r.competitionId,
            userId,
            quantity: r.qty,
            status: "reserved",
            expiresAt: new Date(expiresAtUnix * 1000)
          }))
        });
      } catch (persistErr) {
        // Couldn't record the reservation — release inventory and cancel the session
        // so the customer isn't charged against tickets we can't track.
        await releaseInventory(reserved);
        try { await stripe.checkout.sessions.expire(session.id); } catch (_) { }
        throw persistErr;
      }

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
  const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;
  const totalRevenue =
    round2(allPayments.reduce(
      (sum, item) =>
        sum + Number(item.amount),
      0
    ));

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
      position: iw.position,
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

// exports.getLiveDraws = catchAsync(async (req, res) => {


//   const now = new Date();

//   const competitions =
//     await prisma.competition.findMany({
//       where: {
//         deletedAt: null,
//         endTime: {
//           gte: now
//         }
//       },

//       orderBy: {
//         endTime: "asc"
//       },

//       select: {
//         id: true,
//         title: true,
//         slug: true,
//         images: true,
//         soldTickets: true,
//         totalTickets: true,
//         endTime: true,

//         prizes: {
//           orderBy: {
//             position: "asc"
//           },
//           select: {
//             id: true,
//             title: true,
//             position: true
//           }
//         },

//         instantWinPrizes: {
//           select: {
//             id: true,
//             title: true
//           }
//         }
//       }
//     });

//   const data = competitions.map((item) => {

//     const mainPrize =
//       item.prizes.find(
//         (p) => p.position === 1
//       );

//     const runnerUpPrizes =
//       item.prizes
//         .filter((p) => p.position > 1)
//         .map((p) => p.title);

//     const instantWinTitles =
//       item.instantWinPrizes.map(
//         (p) => p.title
//       );

//     const allPrizes = [];

//     // MAIN PRIZE
//     if (mainPrize) {

//       allPrizes.push({
//         title: mainPrize.title,
//         type: "main"
//       });

//     }

//     // RUNNER UPS
//     if (runnerUpPrizes.length > 0) {

//       allPrizes.push({
//         title:
//           runnerUpPrizes.join(", "),
//         type: "runner_up"
//       });

//     }

//     // INSTANT WINS
//     if (instantWinTitles.length > 0) {

//       allPrizes.push({
//         title:
//           instantWinTitles.join(", "),
//         type: "instant_win"
//       });

//     }

//     return {
//       id: item.id,
//       title: item.title,
//       slug: item.slug,
//       image: item.images?.[0],

//       drawDate: item.endTime,

//       drawTime:
//         item.endTime.toLocaleTimeString(
//           "en-GB",
//           {
//             hour: "2-digit",
//             minute: "2-digit"
//           }
//         ),

//       soldPercentage:
//         item.totalTickets > 0
//           ? Math.round(
//             (item.soldTickets / item.totalTickets) * 100
//           )
//           : 0,

//       prizes: allPrizes
//     };

//   });

//   return successResponse(
//     res,
//     "Live draws fetched successfully",
//     200,
//     data
//   );


// });

exports.getLiveDraws = catchAsync(async (req, res) => {
  try {
    const now = new Date();

    // 1. Fetch current/upcoming/recent live draw record or active competition
    let currentLiveDraw = await prisma.liveDraw.findFirst({
      include: {
        competition: {
          select: {
            id: true,
            title: true,
            slug: true,
            productType: true,
            ticketPrice: true,
            soldTickets: true,
            totalTickets: true,
            endTime: true,
            images: true,
            winnerDetail: true,
            results: {
              where: { position: 1 },
              take: 1,
              include: { user: true, ticket: true }
            }
          }
        }
      },
      orderBy: [
        { status: "asc" }, // LIVE comes before UPCOMING
        { drawDateTime: "desc" }
      ]
    });

    // Fallback: If no explicit LiveDraw record, select the next ending active competition
    if (!currentLiveDraw) {
      const activeComp = await prisma.competition.findFirst({
        where: {
          deletedAt: null
        },
        orderBy: { endTime: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          productType: true,
          ticketPrice: true,
          soldTickets: true,
          totalTickets: true,
          endTime: true,
          images: true,
          winnerDetail: true,
          results: {
            where: { position: 1 },
            take: 1,
            include: { user: true, ticket: true }
          }
        }
      });

      if (activeComp) {
        currentLiveDraw = {
          id: null,
          competitionId: activeComp.id,
          drawDateTime: activeComp.endTime,
          streamUrl: null,
          status: "UPCOMING",
          winningTicketNumber: null,
          winnerName: null,
          winnerLocation: null,
          isWinnerConfirmed: false,
          verifiedBy: "Dream Car Competitions",
          competition: activeComp
        };
      }
    }

    // Auto-populate winner details & dynamic LIVE transition for currentLiveDraw
    if (currentLiveDraw && currentLiveDraw.competition) {
      const comp = currentLiveDraw.competition;
      const firstResult = comp.results?.[0];
      const winDetail = comp.winnerDetail;

      const resolvedName = currentLiveDraw.winnerName || winDetail?.winnerName || firstResult?.user?.name || null;
      const resolvedTicket = currentLiveDraw.winningTicketNumber || (firstResult?.ticket?.ticketNumber ? `#${firstResult.ticket.ticketNumber}` : null);
      const resolvedLocation = currentLiveDraw.winnerLocation || winDetail?.winnerLocation || firstResult?.user?.city || firstResult?.user?.country || "";

      if (resolvedName || resolvedTicket) {
        currentLiveDraw.winnerName = resolvedName || "Winner Confirmed";
        currentLiveDraw.winningTicketNumber = resolvedTicket;
        currentLiveDraw.winnerLocation = resolvedLocation;
        currentLiveDraw.isWinnerConfirmed = true;
        currentLiveDraw.status = "COMPLETED";
      } else {
        currentLiveDraw.isWinnerConfirmed = false;
        // Auto LIVE check: If current time >= drawDateTime and not completed, set status to LIVE dynamically
        const drawTime = currentLiveDraw.drawDateTime ? new Date(currentLiveDraw.drawDateTime) : (comp.endTime ? new Date(comp.endTime) : null);
        if (drawTime && now >= drawTime && currentLiveDraw.status !== "COMPLETED") {
          currentLiveDraw.status = "LIVE";
        }
      }
    }

    // 2. Fetch Recent Draws (Completed live draws & competitions with winner details)
    const completedLiveDraws = await prisma.liveDraw.findMany({
      where: {
        status: "COMPLETED"
      },
      include: {
        competition: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
            endTime: true,
            winnerDetail: true,
            results: {
              take: 1,
              orderBy: { position: "asc" },
              include: {
                user: true,
                ticket: true
              }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 12
    });

    // Helper to safely extract main image string
    const extractMainImage = (imgs) => {
      if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
      if (typeof imgs === "string" && imgs.trim()) {
        try {
          const parsed = JSON.parse(imgs);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
          return imgs;
        } catch (e) {
          return imgs;
        }
      }
      return null;
    };

    // Format recent draws
    let recentDraws = completedLiveDraws.map(ld => {
      const comp = ld.competition;
      const firstResult = comp?.results?.[0];

      return {
        id: ld.id,
        competitionId: comp?.id,
        title: comp?.title || "Competition Draw",
        slug: comp?.slug,
        image: extractMainImage(comp?.images) || "/img/car1.png",
        drawDate: ld.drawDateTime || comp?.endTime,
        winnerName: ld.winnerName || comp?.winnerDetail?.winnerName || firstResult?.user?.name || "Winner Announced",
        winnerLocation: ld.winnerLocation || comp?.winnerDetail?.winnerLocation || "UK",
        winningTicket: ld.winningTicketNumber || (firstResult?.ticket?.ticketNumber ? `#${firstResult.ticket.ticketNumber}` : "N/A"),
        videoUrl: ld.streamUrl || null
      };
    });

    // Fallback for recent draws if DB has few explicit LiveDraw COMPLETED records:
    // fetch completed/ended competitions with winners
    if (recentDraws.length < 4) {
      const endedComps = await prisma.competition.findMany({
        where: {
          deletedAt: null,
          endTime: { lte: now }
        },
        include: {
          winnerDetail: true,
          results: {
            take: 1,
            orderBy: { position: "asc" },
            include: {
              user: true,
              ticket: true
            }
          }
        },
        orderBy: { endTime: "desc" },
        take: 8
      });

      endedComps.forEach(comp => {
        if (!recentDraws.some(rd => rd.competitionId === comp.id)) {
          const firstResult = comp.results?.[0];
          const hasWinner = comp.winnerDetail?.winnerName || firstResult?.user?.name;

          // ONLY include under Recent Draws if the live draw / winner announcement has taken place
          if (hasWinner) {
            recentDraws.push({
              id: `comp-${comp.id}`,
              competitionId: comp.id,
              title: comp.title,
              slug: comp.slug,
              image: extractMainImage(comp.images) || "/img/car1.png",
              drawDate: comp.endTime,
              winnerName: hasWinner,
              winnerLocation: comp.winnerDetail?.winnerLocation || "UK",
              winningTicket: firstResult?.ticket?.ticketNumber ? `#${firstResult.ticket.ticketNumber}` : "#1",
              videoUrl: null
            });
          }
        }
      });
    }

    return successResponse(
      res,
      "Live draws fetched successfully",
      200,
      {
        currentDraw: currentLiveDraw,
        recentDraws
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

exports.toggleHeroCompetition = catchAsync(async (req, res) => {
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
        isHero: competition.isHero === 1 ? 0 : 1
      }
    });

  return successResponse(
    res,
    updated.isHero
      ? "Competition will be shown on Hero Banner"
      : "Competition removed from Hero Banner",
    200,
    updated
  );
});

exports.getLiveDrawByCompetitionId = catchAsync(async (req, res) => {
  const { competitionId } = req.params;
  const compId = parseInt(competitionId);

  const competition = await prisma.competition.findUnique({
    where: { id: compId }
  });

  let liveDraw = await prisma.liveDraw.findUnique({
    where: {
      competitionId: compId
    },
    include: {
      competition: true
    }
  });

  // Fetch WinnerDetail and Position 1 Result for prefilling
  const winnerDetail = await prisma.winnerDetail.findUnique({
    where: { competitionId: compId }
  });

  const firstResult = await prisma.result.findFirst({
    where: { competitionId: compId, position: 1 },
    include: { user: true, ticket: true }
  });

  const resolvedName = winnerDetail?.winnerName || firstResult?.user?.name || null;
  const resolvedTicket = firstResult?.ticket?.ticketNumber ? `#${firstResult.ticket.ticketNumber}` : null;
  const resolvedLocation = winnerDetail?.winnerLocation || firstResult?.user?.city || firstResult?.user?.country || null;
  const hasWinner = Boolean(firstResult || winnerDetail);

  if (!liveDraw) {
    liveDraw = {
      id: null,
      competitionId: compId,
      drawDateTime: competition?.endTime || null,
      streamUrl: null,
      status: hasWinner ? "COMPLETED" : "UPCOMING",
      winningTicketNumber: resolvedTicket,
      winnerName: resolvedName,
      winnerLocation: resolvedLocation,
      isWinnerConfirmed: hasWinner,
      verifiedBy: "Dream Car Competitions",
      competition
    };
  } else {
    liveDraw.winnerName = liveDraw.winnerName || resolvedName;
    liveDraw.winningTicketNumber = liveDraw.winningTicketNumber || resolvedTicket;
    liveDraw.winnerLocation = liveDraw.winnerLocation || resolvedLocation;
    if (hasWinner) {
      liveDraw.isWinnerConfirmed = true;
      if (liveDraw.status === "UPCOMING") {
        liveDraw.status = "COMPLETED";
      }
    }
  }

  return successResponse(
    res,
    "Live draw fetched successfully",
    200,
    liveDraw
  );
});

exports.updateLiveDrawSettings = catchAsync(async (req, res) => {
  const {
    competitionId,
    drawDateTime,
    streamUrl,
    status,
    winningTicketNumber,
    winnerName,
    winnerLocation,
    isWinnerConfirmed,
    verifiedBy
  } = req.body;

  if (!competitionId) {
    return errorResponse(res, "Competition ID is required", 400);
  }

  const compId = parseInt(competitionId);

  const competitionExists = await prisma.competition.findUnique({
    where: { id: compId }
  });

  if (!competitionExists) {
    return errorResponse(res, "Competition not found", 404);
  }

  // ✅ Validation: Live draw date & time must be on or after competition end date (unless competition is sold out)
  const isSoldOut = competitionExists.soldTickets >= competitionExists.totalTickets;
  if (!isSoldOut && drawDateTime && competitionExists.endTime) {
    const drawDate = new Date(drawDateTime);
    const endDate = new Date(competitionExists.endTime);
    if (drawDate < endDate) {
      return errorResponse(
        res,
        "Live draw date & time must be on or after the competition end date (unless competition is sold out)",
        400
      );
    }
  }

  const liveDraw = await prisma.liveDraw.upsert({
    where: {
      competitionId: compId
    },
    update: {
      ...(drawDateTime !== undefined && { drawDateTime: drawDateTime ? new Date(drawDateTime) : null }),
      ...(streamUrl !== undefined && { streamUrl }),
      ...(status !== undefined && { status }),
      ...(winningTicketNumber !== undefined && { winningTicketNumber }),
      ...(winnerName !== undefined && { winnerName }),
      ...(winnerLocation !== undefined && { winnerLocation }),
      ...(isWinnerConfirmed !== undefined && { isWinnerConfirmed: Boolean(isWinnerConfirmed) }),
      ...(verifiedBy !== undefined && { verifiedBy })
    },
    create: {
      competitionId: compId,
      drawDateTime: drawDateTime ? new Date(drawDateTime) : competitionExists.endTime,
      streamUrl: streamUrl || null,
      status: status || "UPCOMING",
      winningTicketNumber: winningTicketNumber || null,
      winnerName: winnerName || null,
      winnerLocation: winnerLocation || null,
      isWinnerConfirmed: isWinnerConfirmed ? Boolean(isWinnerConfirmed) : false,
      verifiedBy: verifiedBy || "Dream Car Competitions"
    }
  });

  // ✅ Bi-directional sync: if winnerName or winnerLocation is updated, sync to WinnerDetail (if existing)
  if (winnerName !== undefined || winnerLocation !== undefined) {
    try {
      const existingWinnerDetail = await prisma.winnerDetail.findUnique({
        where: { competitionId: compId }
      });
      if (existingWinnerDetail) {
        await prisma.winnerDetail.update({
          where: { competitionId: compId },
          data: {
            ...(winnerName !== undefined && { winnerName }),
            ...(winnerLocation !== undefined && { winnerLocation })
          }
        });
      }
    } catch (syncErr) {
      console.error("Error syncing LiveDraw to WinnerDetail:", syncErr);
    }
  }

  return successResponse(
    res,
    "Live draw settings updated successfully",
    200,
    liveDraw
  );
});