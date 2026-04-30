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