const NewsletterWelcomeTemplate = require("../emailsTemplates/NewsletterWelcomeTemplate");
const prisma = require("../prismaconfig");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/EmailMailler");
const { successResponse, errorResponse } = require("../utils/ErrorHandling");


const axios = require("axios");

const headers = {
    Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,
    accept: "application/json",
    "content-type": "application/json",
    revision: "2024-10-15"
};

const subscribeToKlaviyo = async ({ email, name, phone }) => {
    try {
        let firstName = "";
        let lastName = "";

        if (name?.trim()) {
            const parts = name.trim().split(" ");
            firstName = parts[0];
            lastName = parts.slice(1).join(" ");
        }

        const rawPhone = phone?.trim() || "";

        const profileAttributes = {
            email,
            first_name: firstName,
            last_name: lastName,
            properties: {}
        };

        const subscriptionProfileAttributes = {
            email
        };

        if (rawPhone) {
            profileAttributes.properties.phone = rawPhone;

            if (rawPhone.startsWith("+")) {
                profileAttributes.phone_number = rawPhone;
                subscriptionProfileAttributes.phone_number = rawPhone;
            }
        }

        // 1. Create or Update Profile (Upsert)
        await axios.post(
            "https://a.klaviyo.com/api/profile-import/",
            {
                data: {
                    type: "profile",
                    attributes: profileAttributes
                }
            },
            { headers }
        );

        // 2. Subscribe to Newsletter List
        await axios.post(
            "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs",
            {
                data: {
                    type: "profile-subscription-bulk-create-job",
                    attributes: {
                        custom_source: "Newsletter Form",
                        profiles: {
                            data: [
                                {
                                    type: "profile",
                                    attributes: subscriptionProfileAttributes
                                }
                            ]
                        }
                    },
                    relationships: {
                        list: {
                            data: {
                                type: "list",
                                id: process.env.WEBSITE_NEWSLETTER_KLAVIYO_LIST_ID
                            }
                        }
                    }
                }
            },
            { headers }
        );

        console.log("Klaviyo profile synced and subscribed successfully.");

        return true;

    } catch (error) {

        console.log(
            JSON.stringify(error.response?.data, null, 2)
        );

        return true;
    }
};

exports.subscribeNewsletter = catchAsync(async (req, res) => {
    try {
        const { email, fullName, phone } = req.body;
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanName = (fullName || "").trim();
        const cleanPhone = (phone || "").trim();
        if (!cleanName) {
            return errorResponse(res, "Full name is required", 200);
        }
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

        await subscribeToKlaviyo({
            email: cleanEmail,
            name: cleanName,
            phone: cleanPhone
        });

        let newsletter;
        try {
            newsletter = await prisma.newsletter.create({
                data: {
                    email: cleanEmail,
                    fullName: cleanName,
                    phone: cleanPhone || null
                }
            });
        } catch (err) {
            if (err?.code === "P2002") {
                return successResponse(
                    res, "You are already subscribed to our newsletter!",
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
            where.OR = [
                {
                    email: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    fullName: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    phone: {
                        contains: search,
                    },
                },
            ];
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

        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});
