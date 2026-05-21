const NewsletterWelcomeTemplate = require("../emailsTemplates/NewsletterWelcomeTemplate");
const prisma = require("../prismaconfig");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/EmailMailler");
const { successResponse, errorResponse } = require("../utils/ErrorHandling");

exports.subscribeNewsletter = catchAsync(async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return errorResponse(
                res,
                "Email is required",
                200
            );
        }
        const existing = await prisma.newsletter.findUnique({
            where: { email }
        });
        if (existing) {
            return errorResponse(
                res,
                "Email already subscribed",
                200
            );
        }
        const newsletter = await prisma.newsletter.create({
            data: { email }
        });
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
            email,
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