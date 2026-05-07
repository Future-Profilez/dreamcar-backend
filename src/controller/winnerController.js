const catchAsync = require("../utils/catchAsync");
const { validationErrorResponse, errorResponse, successResponse } = require("../utils/ErrorHandling");
const prisma = require("../prismaconfig");

exports.drawWinner = catchAsync(async (req, res) => {
    try {
        const { competitionId, ticketId, position = 1 } = req.body;

        if (!competitionId || !ticketId) {
            return validationErrorResponse(res, "Missing required fields");
        }

        // ✅ get competition
        const competition = await prisma.competition.findUnique({
            where: { id: Number(competitionId) },
        });

        if (!competition) {
            return errorResponse(res, "Competition not found", 200);
        }

        // 🔥 ✅ IMPORTANT CHECK
        const now = new Date();

        const isEnded = new Date(competition.endTime) <= now;
        const isSoldOut = competition.soldTickets >= competition.totalTickets;

        if (!isEnded && !isSoldOut) {
            return errorResponse(
                res,
                "Winner can only be selected after competition ends or tickets are sold out",
                200
            );
        }

        // ✅ check ticket exists
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                user: true,
            },
        });

        if (!ticket) {
            return errorResponse(res, "Ticket not found", 200);
        }

        if (!ticket.isEligible) {
            return errorResponse(res, "This ticket is not eligible", 200);
        }

        // ✅ check if position already assigned
        const existing = await prisma.result.findUnique({
            where: {
                competitionId_position: {
                    competitionId: Number(competitionId),
                    position: Number(position),
                },
            },
        });

        if (existing) {
            return errorResponse(
                res,
                `Position ${position} already assigned`,
                200
            );
        }

        // ✅ create result
        const result = await prisma.result.create({
            data: {
                competitionId: Number(competitionId),
                userId: ticket.userId,
                ticketId: ticket.id,
                position: Number(position),
                isManual: true,
            },
        });

        return successResponse(res, "Winner assigned successfully", 200, result);

    } catch (error) {
        console.log("Draw Winner Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.getUserWins = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        const wins = await prisma.result.findMany({
            where: { userId },
            include: {
                competition: {
                    select: {
                        id: true,
                        title: true,
                        images: true,
                        endTime: true,
                        productType: true,
                        prizes: true
                    },
                },
                ticket: {
                    select: {
                        ticketCode: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        if (!wins || wins.length === 0) {
            return errorResponse(res, "No winning entries found", 200, []);
        }

        const formatted = wins.map((w) => {
            // Find the specific prize for this position
            const wonPrize = w.competition.prizes?.find(p => p.position === w.position);

            return {
                id: w.id,
                title: wonPrize ? wonPrize.title : w.competition.title,
                image: wonPrize?.prizeDetailImage || w.competition.images?.[0],
                ticketCode: w.ticket?.ticketCode,
                position: w.position,
                drawDate: w.competition.endTime,
                competitionId: w.competition.id,
                type: w.competition.productType
            };
        });

        return successResponse(res, "Wins fetched", 200, formatted);
    } catch (error) {
        console.error("User Winning competition Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.getPublicWinners = catchAsync(async (req, res) => {
    try {
        const winners = await prisma.result.findMany({
            where: {
                position: 1
            },
            include: {
                competition: {
                    select: {
                        title: true,
                        endTime: true,
                        prizes: true
                    },
                },
                user: {
                    select: {
                        name: true,
                    },
                },
                ticket: {
                    select: {
                        ticketCode: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        if (!winners || winners.length === 0) {
            return errorResponse(res, "No winners found", 200, []);
        }

        const data = winners.map((w) => {
            const wonPrize = w.competition.prizes?.find(p => p.position === w.position);
            return {
                title: wonPrize ? wonPrize.title : w.competition.title,
                prizeImage: wonPrize?.prizeDetailImage || '/img/car3d1.png',
                date: w.competition.endTime,
                winnerName: w.user.name,
                image: w.winnerImage || "/img/trophy.png",
                ticketCode: w.ticket?.ticketCode,
                position: w.position
            };
        });

        return successResponse(res, "Winners fetched", 200, data);
    } catch (error) {
        console.error("Public Winners Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});


exports.getUserInstantWins = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        const instantWins = await prisma.instantWin.findMany({
            where: {
                claimedById: userId,
            },

            include: {
                competition: {
                    select: {
                        id: true,
                        title: true,
                        images: true,
                        endTime: true,
                    },
                },
                prize: {
                    select: {
                        title: true,
                        image: true,
                    },
                },
                ticket: {
                    select: {
                        ticketCode: true,
                    },
                },
            },
            orderBy: {
                claimedAt: "desc",
            },
        });

        if (!instantWins || instantWins.length === 0) {
            return successResponse(
                res,
                "No instant wins found",
                200,
                []
            );
        }
        console.log("Instant win :", instantWins);
        const formatted = instantWins.map((w) => ({
            id: w.id,
            winType: "instant",
            competitionId: w.competition.id,
            competitionTitle: w.competition.title,
            title: w.prize.title,
            image:
                w.prize.image ||
                w.competition.images?.[0],
            ticketCode: w.ticket?.ticketCode,
            claimedAt: w.claimedAt,
            drawDate: w.competition.endTime,
            type: w.competition.productType,
            position: "Instant Win",
            ticketCode: w.ticket?.ticketCode
        }));

        return successResponse(
            res,
            "Instant wins fetched successfully",
            200,
            formatted
        );

    } catch (error) {
        console.log("Get Instant Wins Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});