const NewsletterWelcomeTemplate = require("../emailsTemplates/NewsletterWelcomeTemplate");
const prisma = require("../prismaconfig");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/EmailMailler");
const { successResponse, errorResponse } = require("../utils/ErrorHandling");

exports.subscribeNewsletter = catchAsync(async (req, res) => {
    try {
        const { email } = req.body;
        const cleanEmail = (email || "").trim().toLowerCase();
        if (!cleanEmail) {
            return errorResponse(
                res,
                "Email is required",
                200
            );
        }
        const existing = await prisma.newsletter.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: "insensitive",
                },
            },
        });
        if (existing) {
            return successResponse(
                res,
                "You are already subscribed to our newsletter!",
                200
            );
        }
        let newsletter;
        try {
            newsletter = await prisma.newsletter.create({
                data: { email: cleanEmail }
            });
        } catch (err) {
            if (err?.code === "P2002") {
                return successResponse(
                    res,
                    "You are already subscribed to our newsletter!",
                    200
                );
            }
            throw err;
        }
        const latestCompetitions = await prisma.competition.findMany({
                where: {
                    deletedAt: null
                },
                orderBy: {
                    createdAt: "desc"
                },
                take: 3
            });

        await sendEmail({
            email: cleanEmail,
            subject: "Welcome To DreamCar Competitions 🚗",
            emailHtml: NewsletterWelcomeTemplate({
                    competitions:
                        latestCompetitions
                })
        });
        return successResponse(
            res,
            "Subscribed successfully",
            200,
            newsletter
        );
    } catch (error) {
        console.log(error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.deleteNewsletterSubscriber = catchAsync(async (req, res) => {
    try {
        const { id } = req.params;
        
        // Admin check
        if (req.user.role !== "admin") {
            return errorResponse(res, "Unauthorized", 403);
        }

        if (!id) {
            return errorResponse(res, "Subscriber ID is required", 400);
        }

        // Hard delete
        await prisma.newsletter.delete({
            where: { id: parseInt(id) }
        });

        return successResponse(res, "Subscriber deleted successfully", 200);
    } catch (error) {
        console.error("Delete Newsletter Subscriber Error:", error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getNewsletterSubscribers = catchAsync(async (req, res) => {
    try {
        const { search, sort } = req.query;
        let where = {};
        // SEARCH
        if (search) {
            where.email = {
                contains: search,
                mode: "insensitive"
            };
        }
        // SORT
        let orderBy = {
            createdAt: "desc"
        };
        if (sort === "oldest") {
            orderBy = {
                createdAt: "asc"
            };
        }
        const subscribers =
            await prisma.newsletter.findMany({
                where,
                orderBy
            });
        return successResponse(
            res,
            "Subscribers fetched successfully",
            200,
            subscribers
        );
    } catch (error) {
        console.log(error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});
