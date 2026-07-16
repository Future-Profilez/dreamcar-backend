const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const stripe = require("../utils/stripe");
const { processSuccessfulPayment } = require("../utils/paymentProcessor");
const { getCompetitionTicketDiscountPercent } = require("../utils/ticketDiscount");

const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;

const enrichPaymentWithDiscount = (payment) => {
    const storedAmount = Number(payment.amount) || 0;
    const isCompetition = payment.type === "competition";
    if (!isCompetition) {
        return {
            ...payment,
            storedAmount,
            amount: storedAmount,
            originalAmount: storedAmount,
            discountAmount: 0,
            discountPercent: 0
        };
    }

    const qty = Number(payment.quantity || 0);
    const ticketPrice = Number(payment.competition?.ticketPrice || 0);
    const discountPercent = getCompetitionTicketDiscountPercent(qty);
    const originalAmount = qty > 0 && ticketPrice > 0 ? round2(qty * ticketPrice) : storedAmount;
    const expectedDiscountedAmount = round2(originalAmount * (1 - discountPercent));
    const amount =
        discountPercent > 0 && Math.abs(storedAmount - originalAmount) < 0.01
            ? expectedDiscountedAmount
            : storedAmount;
    const discountAmount = round2(Math.max(0, originalAmount - amount));

    return {
        ...payment,
        storedAmount,
        amount,
        originalAmount,
        discountAmount,
        discountPercent
    };
};

exports.verifyPayment = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id } = req.query;

        let payment = await prisma.stripePayment.findMany({
            where: {
                sessionId: session_id,
                userId: userId
            },
            include: {
                competition: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        ticketPrice: true
                    }
                },
                tickets: true
            }
        });
        console.log("PAYMENTTT in VERIFY PAYMENT ", payment);

        if (!payment || payment.length === 0) {
            // If payment not in DB, fallback to querying Stripe directly (handles webhook delays or local testing)
            if (session_id && session_id.startsWith('cs_')) {
                try {
                    const session = await stripe.checkout.sessions.retrieve(session_id);
                    console.log("SESSIONNN ", session);
                    if (session.payment_status === 'paid') {

                        // CHECK IF PAYMENT ALREADY EXISTS
                        const existingPayment = await prisma.stripePayment.findFirst({
                            where: {
                                sessionId: session.id
                            }
                        });

                        // ONLY PROCESS IF NOT EXISTS
                        if (!existingPayment) {

                            if (session.metadata?.type === "wallet_recharge") {

                                const { processWalletRecharge } = require("../utils/paymentProcessor");

                                await processWalletRecharge(session);

                            } else {

                                await processSuccessfulPayment(session);

                            }

                        }

                        // ALWAYS FETCH PAYMENT AGAIN
                        payment = await prisma.stripePayment.findMany({
                            where: {
                                sessionId: session_id,
                                userId: userId
                            },
                            include: {
                                competition: {
                                    select: {
                                        id: true,
                                        title: true,
                                        slug: true,
                                        ticketPrice: true
                                    }
                                },
                                tickets: true
                            }
                        });

                    }
                } catch (stripeErr) {
                    console.error("Stripe session retrieve error:", stripeErr.message);
                }
            }
        }

        if (!payment || payment.length === 0) {
            return errorResponse(res, "Payment not found or not completed", 200);
        }

        const enrichedPayments = payment.map(enrichPaymentWithDiscount);
        const totalAmount = enrichedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const subtotalAmount = enrichedPayments.reduce((sum, p) => sum + Number(p.originalAmount || 0), 0);
        const discountTotal = enrichedPayments.reduce((sum, p) => sum + Number(p.discountAmount || 0), 0);
        console.log("TOTALLLL amount in verify pyament ", totalAmount);

        return successResponse(
            res,
            "Payment fetched successfully",
            200,
            {
                payments: enrichedPayments,
                subtotalAmount,
                discountTotal,
                totalAmount,
                createdAt: payment[0]?.createdAt
            }
        );
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
                competition: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        ticketPrice: true
                    }
                },
                tickets: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const data = payments.map((p) => {
            const enriched = enrichPaymentWithDiscount(p);
            let competitionName = p.competition?.title || "N/A";

            if (p.type === "gift_credit") {
                competitionName = "Gift Card / Credit";
            } else if (p.type === "wallet_recharge") {
                competitionName = "Wallet Recharge";
            }

            return {
                id: p.id,
                orderId: p.id.slice(0, 6), // short display id
                paymentType: p.type || "competition",
                competition: competitionName,
                competitionSlug: p.competition?.slug || null,
                tickets: p.quantity || 0,
                originalAmount: enriched.originalAmount,
                discountAmount: enriched.discountAmount,
                discountPercent: enriched.discountPercent,
                amount: enriched.amount,
                date: p.createdAt,
                competitionId: p.competitionId,
                sessionId: p.sessionId,
                ticketNumbers: p.tickets.map(t => `#${t.ticketNumber}`),
                status: p.status
            };
        });

        return successResponse(res, "Payment history fetched", 200, data);

    } catch (error) {
        console.error("Payment History Error:", error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

// exports.getAllPayments = catchAsync(async (req, res) => {
//     try {
//         const payments = await prisma.stripePayment.findMany({
//             include: {
//                 user: {
//                     select: {
//                         id: true,
//                         name: true,
//                         email: true,
//                     },
//                 },
//                 competition: {
//                     select: {
//                         id: true,
//                         title: true,
//                         slug: true,
//                     },
//                 },
//                 tickets: {
//                     select: {
//                         ticketNumber: true,
//                         ticketCode: true,
//                         isEligible: true,
//                         isInstantWin: true,
//                     },
//                 },
//             },
//             orderBy: {
//                 createdAt: "desc",
//             },
//         });
//         if (!payments || payments.length === 0) {
//             return successResponse(
//                 res,
//                 "No payments found",
//                 200,
//                 []
//             );
//         }
//         const data = payments.map((p) => ({
//             id: p.id,
//             orderId: p.id.slice(0, 6),
//             userName: p.user?.name,
//             userEmail: p.user?.email,
//             competition: p.competition?.title || "N/A",
//             competitionSlug: p.competition?.slug || null,
//             competitionId: p.competition?.id || null,
//             tickets: p.quantity || 0,
//             amount: p.amount,
//             currency: p.currency,
//             status: p.status,
//             paymentType: p.type,
//             sessionId: p.sessionId,
//             stripePaymentId: p.stripePaymentId,
//             ticketNumbers: p.tickets.map(
//                 (t) => t.ticketNumber
//             ),
//             ticketCodes: p.tickets.map(
//                 (t) => t.ticketCode
//             ),
//             eligibleTickets: p.tickets.filter(
//                 (t) => t.isEligible
//             ).length,
//             instantWinTickets: p.tickets.filter(
//                 (t) => t.isInstantWin
//             ).length,
//             createdAt: p.createdAt,
//         }));

//         return successResponse(
//             res,
//             "Payments fetched successfully",
//             200,
//             data
//         );
//     } catch (error) {
//         console.error("Get All Payments Error:", error);
//         return errorResponse(
//             res,
//             error.message || "Internal Server Error",
//             500
//         );
//     }
// });


exports.getAllPayments = catchAsync(async (req, res) => {
    try {
        const {
            search,
            status,
            paymentType,
            sort
        } = req.query;
        let where = {};
        // SEARCH
        if (search) {
            where.OR = [
                {
                    user: {
                        name: {
                            contains: search,
                            mode: "insensitive"
                        }
                    }
                },
                {
                    user: {
                        email: {
                            contains: search,
                            mode: "insensitive"
                        }
                    }
                },
                {
                    competition: {
                        title: {
                            contains: search,
                            mode: "insensitive"
                        }
                    }
                },
                {
                    sessionId: {
                        contains: search,
                        mode: "insensitive"
                    }
                }
            ];
        }
        // STATUS FILTER
        if (status) {
            where.status = status;
        }
        // PAYMENT TYPE FILTER
        if (paymentType) {
            where.type = paymentType;
        }
        // SORT
        let orderBy = {
            createdAt: "desc"
        };
        if (sort === "oldest") {
            orderBy = {
                createdAt: "asc"
            };

        } else if (sort === "highest") {
            orderBy = {
                amount: "desc"
            };

        } else if (sort === "lowest") {
            orderBy = {
                amount: "asc"
            };
        }

        const payments = await prisma.stripePayment.findMany({
            where,
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
                        ticketPrice: true,
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
            orderBy,
        });
        const enrichedPayments = payments.map(enrichPaymentWithDiscount);
        // DASHBOARD STATS
        const totalRevenue = enrichedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalCompetitionRevenue = enrichedPayments
            .filter(p => p.type === "competition")
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const totalGiftRevenue = enrichedPayments
            .filter(p => p.type === "gift_credit")
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const totalWalletRevenue = enrichedPayments
            .filter(p => p.type === "wallet_recharge")
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const data = enrichedPayments.map((p) => ({
            originalAmount: p.originalAmount,
            discountAmount: p.discountAmount,
            discountPercent: p.discountPercent,
            id: p.id,
            orderId: p.id.slice(0, 6),
            userName: p.user?.name,
            userEmail: p.user?.email,
            competition:
                p.type === "gift_credit"
                    ? "Gift Credit"
                    : p.type === "wallet_recharge"
                        ? "Wallet Recharge"
                        : p.competition?.title || "N/A",

            competitionSlug: p.competition?.slug || null,
            competitionId: p.competition?.id || null,
            tickets: p.quantity || 0,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            paymentType: p.type,
            sessionId: p.sessionId,
            stripePaymentId: p.stripePaymentId,
            ticketNumbers: p.tickets.map((t) => t.ticketNumber),
            ticketCodes: p.tickets.map((t) => t.ticketCode),
            createdAt: p.createdAt,
        }));

        return successResponse(
            res,
            "Payments fetched successfully",
            200,
            {
                payments: data,
                stats: {
                    totalRevenue,
                    totalCompetitionRevenue,
                    totalGiftRevenue,
                    totalWalletRevenue,
                    totalTransactions: payments.length
                }
            }
        );

    } catch (error) {
        console.error("Get All Payments Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});
