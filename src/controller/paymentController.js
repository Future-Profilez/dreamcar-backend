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