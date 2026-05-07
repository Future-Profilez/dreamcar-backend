const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");

exports.getTickets = catchAsync(async (req, res) => {
    try {
        const tickets = await prisma.ticket.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                competition: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        if (!tickets || tickets.length === 0) {
            return successResponse(res, "No tickets found", 200, []);
        }

        const formattedTickets = tickets.map((ticket) => ({
            ticketId: ticket.id,
            username: ticket.user?.name,
            competition: ticket.competition?.title,
            ticketNumber: ticket.ticketNumber,
            ticketCode: ticket.ticketCode,
            isEligible: ticket.isEligible,
            isInstantWin: ticket.isInstantWin,
            date: ticket.createdAt,
        }));

        return successResponse(
            res,
            "Tickets fetched successfully",
            200,
            formattedTickets
        );
    } catch (error) {
        console.log("Get Tickets Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.getTicketsByCompetition = catchAsync(async (req, res) => {
    const { competitionId } = req.params;

    const tickets = await prisma.ticket.findMany({
        where: {
            competitionId: Number(competitionId),
        },
        include: {
            user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // 🔥 GROUP BY USER
    const grouped = {};

    tickets.forEach((t) => {
        const userId = t.user.id;

        if (!grouped[userId]) {
            grouped[userId] = {
                userId,
                name: t.user.name,
                tickets: [],
                correctCount: 0,
                total: 0,
                latestDate: t.createdAt,
            };
        }

        grouped[userId].tickets.push({
            id: t.id,
            ticketNumber: t.ticketNumber,
            ticketCode: t.ticketCode,
            isEligible: t.isEligible,
        });

        grouped[userId].total += 1;

        if (t.isEligible) {
            grouped[userId].correctCount += 1;
        }

        // latest date
        if (t.createdAt > grouped[userId].latestDate) {
            grouped[userId].latestDate = t.createdAt;
        }
    });

    const result = Object.values(grouped).map((u) => ({
        id: u.userId,
        name: u.name,
        ticketNo: `#${u.tickets[0]?.ticketNumber}`, // first ticket ref
        entries: `${u.total} tickets`,
        status: u.correctCount > 0 ? "Correct" : "Incorrect",
        isEligible: u.correctCount > 0,
        date: u.latestDate,
        tickets: u.tickets, // 🔥 important for winner selection
    }));

    return successResponse(res, "Grouped tickets fetched", 200, result);
});