const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const axios = require("axios");

const headers = {
    Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,
    accept: "application/json",
    "content-type": "application/json",
    revision: "2024-10-15"
};

const subscribeToKlaviyo = async ({ email, name, phone, listId, customSource }) => {
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

        // 2. Subscribe to List
        await axios.post(
            "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs",
            {
                data: {
                    type: "profile-subscription-bulk-create-job",
                    attributes: {
                        custom_source: customSource || "Contact Form",
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
                                id: listId
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

exports.addEnquiry = catchAsync(async (req, res) => {
    try {
        const {
            fullName,
            phone,
            email,
            subject,
            message,
        } = req.body;

        if (!fullName || !email || !subject || !message) {
            return errorResponse(res, "All required fields must be provided", 200);
        }

        // Sync to Klaviyo
        await subscribeToKlaviyo({
            email: email.trim().toLowerCase(),
            name: fullName.trim(),
            phone: phone ? phone.trim() : "",
            listId: process.env.WEBSITE_CONTACT_FORM_KLAVIYO_LIST_ID,
            customSource: "Contact Form"
        });

        const contact = await prisma.contact.create({
            data: {
                fullName,
                phone,
                email,
                subject,
                message,
            },
        });

        return successResponse(
            res,
            "Message sent successfully",
            200,
            contact
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.listEnquiries = catchAsync(async (req, res) => {
    try {
        const {
            search,
            sort
        } = req.query;
        let where = {
            deletedAt: null,
        };
        // SEARCH
        if (search) {
            where.OR = [
                {
                    fullName: {
                        contains: search,
                        mode: "insensitive"
                    }
                },

                {
                    email: {
                        contains: search,
                        mode: "insensitive"
                    }
                },

                {
                    subject: {
                        contains: search,
                        mode: "insensitive"
                    }
                },

                {
                    phone: {
                        contains: search,
                        mode: "insensitive"
                    }
                }

            ];
        }

        // SORT
        let orderBy = {
            createdAt: "desc",
        };

        if (sort === "oldest") {
            orderBy = {
                createdAt: "asc"
            };
        } else if (sort === "name") {
            orderBy = {
                fullName: "asc"
            };
        }
        const enquiries = await prisma.contact.findMany({
            where,
            orderBy,
        });

        if (!enquiries || enquiries.length === 0) {
            return successResponse(
                res,
                "No enquiries found",
                200,
                []
            );
        }

        const formatted = enquiries.map((item) => ({
            id: item.id,
            fullName: item.fullName,
            phone: item.phone,
            email: item.email,
            subject: item.subject,
            message: item.message,
            createdAt: item.createdAt,
        }));

        return successResponse(
            res,
            "Enquiries fetched successfully",
            200,
            formatted
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.deleteEnquiry = catchAsync(async (req, res) => {
    try {
        const { id } = req.params;
        const enquiry = await prisma.contact.findUnique({
            where: {
                id: parseInt(id)
            }
        });
        if (!enquiry) {
            return errorResponse(
                res,
                "Enquiry not found",
                200
            );
        }
        if (enquiry.deletedAt) {
            return errorResponse(
                res,
                "Enquiry already deleted",
                200
            );
        }
        await prisma.contact.update({
            where: {
                id: parseInt(id)
            },
            data: {
                deletedAt: new Date()
            }
        });
        return successResponse(
            res,
            "Enquiry deleted successfully",
            200
        );
    } catch (error) {

        return errorResponse(
            res,
            error.message ||
            "Internal Server Error",
            500
        );
    }
});