const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");

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
        console.log("Contact Form Error:", error);

        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.listEnquiries = catchAsync(async (req, res) => {
    try {
        const enquiries = await prisma.contact.findMany({
            where: {
                deletedAt: null,
            },
            orderBy: {
                createdAt: "desc",
            },
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
        console.log("List Enquiries Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});