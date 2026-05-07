const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");

exports.verifyPayment = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id } = req.query;

        if (!session_id) {
            return errorResponse(res, "Session ID is required", 200);
        }
        const payment = await prisma.stripePayment.findFirst({
            where: {
                sessionId: session_id,
                userId: userId
            }
        });

        if (!payment) {
            return errorResponse(res, "Payment not found", 200);
        }

        const competition = await prisma.competition.findUnique({
            where: { id: payment.competitionId }
        });

        return successResponse(res, "Payment fetched successfully", 200, {
            ...payment,
            competition
        });

    } catch (error) {
        console.error("Verify Payment Error:", error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});


exports.getPaymentHistory = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;

        const payments = await prisma.stripePayment.findMany({
            where: {
                userId,

            },
            include: {
                competition: true,
                tickets: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const data = payments.map((p) => ({
            id: p.id,
            orderId: p.id.slice(0, 6), // short display id
            competition: p.competition?.title || "N/A",
            competitionSlug: p.competition?.slug || null,
            tickets: p.quantity || 0,
            amount: p.amount,
            date: p.createdAt,
            competitionId: p.competitionId,
            ticketNumbers: p.tickets.map(t => t.ticketNumber),
            status: p.status
        }));

        return successResponse(res, "Payment history fetched", 200, data);

    } catch (error) {
        console.error("Payment History Error:", error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getAllPayments = catchAsync(async (req, res) => {
    try {
        const payments = await prisma.stripePayment.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                competition: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
                tickets: {
                    select: {
                        ticketNumber: true,
                        ticketCode: true,
                        isEligible: true,
                        isInstantWin: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        if (!payments || payments.length === 0) {
            return successResponse(
                res,
                "No payments found",
                200,
                []
            );
        }
        const data = payments.map((p) => ({
            id: p.id,
            orderId: p.id.slice(0, 6),
            userName: p.user?.name,
            userEmail: p.user?.email,
            competition: p.competition?.title || "N/A",
            competitionSlug: p.competition?.slug || null,
            competitionId: p.competition?.id || null,
            tickets: p.quantity || 0,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            paymentType: p.type,
            sessionId: p.sessionId,
            stripePaymentId: p.stripePaymentId,
            ticketNumbers: p.tickets.map(
                (t) => t.ticketNumber
            ),
            ticketCodes: p.tickets.map(
                (t) => t.ticketCode
            ),
            eligibleTickets: p.tickets.filter(
                (t) => t.isEligible
            ).length,
            instantWinTickets: p.tickets.filter(
                (t) => t.isInstantWin
            ).length,
            createdAt: p.createdAt,
        }));

        return successResponse(
            res,
            "Payments fetched successfully",
            200,
            data
        );
    } catch (error) {
        console.error("Get All Payments Error:",error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});