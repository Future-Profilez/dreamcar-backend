const catchAsync = require("../utils/catchAsync");
const { validationErrorResponse, errorResponse, successResponse } = require("../utils/ErrorHandling");
const prisma = require("../prismaconfig");
const sendEmail = require("../utils/EmailMailler");
const { createAdminNotification } = require("../utils/createAdminNotification");

exports.drawWinner = catchAsync(async (req, res) => {
    try {
        const { competitionId, ticketId, position = 1 } = req.body;

        if (!competitionId || !ticketId) {
            return validationErrorResponse(res, "Missing required fields");
        }

        // ✅ get competition
        const competition = await prisma.competition.findUnique({
            where: { id: Number(competitionId) },
            include: { prizes: true }
        });

        if (!competition) {
            return errorResponse(res, "Competition not found", 200);
        }

        // 🔥 ✅ IMPORTANT CHECK
        const now = new Date();

        const isEnded = new Date(competition.endTime) <= now;
        const isSoldOut = competition.soldTickets >= competition.totalTickets;

        if (!isEnded && !isSoldOut) {
            return errorResponse(
                res,
                "Winner can only be selected after competition ends or tickets are sold out",
                200
            );
        }

        // ✅ check ticket exists
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                user: true,
            },
        });

        if (!ticket) {
            return errorResponse(res, "Ticket not found", 200);
        }

        if (!ticket.isEligible) {
            return errorResponse(res, "This ticket is not eligible", 200);
        }

        // ✅ check if position already assigned
        const existing = await prisma.result.findUnique({
            where: {
                competitionId_position: {
                    competitionId: Number(competitionId),
                    position: Number(position),
                },
            },
        });

        if (existing) {
            return errorResponse(
                res,
                `Position ${position} already assigned`,
                200
            );
        }

        // ✅ duplicate winner prevention (check if user already won in this competition)
        const userAlreadyWon = await prisma.result.findFirst({
            where: {
                competitionId: Number(competitionId),
                userId: ticket.userId
            }
        });

        if (userAlreadyWon) {
            return errorResponse(
                res,
                "This user has already won a prize in this competition",
                200
            );
        }

        // ✅ create result
        const result = await prisma.result.create({
            data: {
                competitionId: Number(competitionId),
                userId: ticket.userId,
                ticketId: ticket.id,
                position: Number(position),
                isManual: true,
            },
        });

        try {
            const wonPrize = competition.prizes?.find(p => p.position === Number(position));
            const prizeTitle = wonPrize ? wonPrize.title : competition.title;
            const positionText = Number(position) === 1 ? "Main Winner" : `Runner-up (Position ${position})`;
            const ticketCode = ticket.ticketCode || `#${ticket.ticketNumber}`;

            await createAdminNotification({
                key: `winner-decided-${result.id}`,
                type: "winner_decided",
                title: "Winner Decided",
                message: `${ticket.user.name} selected as ${positionText} for ${competition.title} (Prize: ${prizeTitle}, Ticket: ${ticketCode}).`,
                meta: {
                    competitionId: Number(competitionId),
                    resultId: result.id,
                    userId: ticket.userId,
                    position: Number(position),
                    prizeTitle,
                    ticketCode
                }
            });
        } catch (notifyErr) {
        }

        // ✅ send winner email
        try {
            if (ticket.user && ticket.user.email) {
                const wonPrize = competition.prizes?.find(p => p.position === Number(position));
                const prizeTitle = wonPrize ? wonPrize.title : competition.title;
                const positionText = Number(position) === 1 ? "Main Winner" : `Runner-up (Position ${position})`;
                const ticketCode = ticket.ticketCode || `#${ticket.ticketNumber}`;

                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #f0f0f0; border-radius: 16px; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                        <div style="text-align: center; margin-bottom: 32px;">
                            <h1 style="color: #1a1a1a; margin: 0; display: inline-block; background-color: #e6ffe6; padding: 6px 12px; border-radius: 4px; font-size: 28px;">Congratulations! 🎉</h1>
                        </div>
                        
                        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                            Hi ${ticket.user.name},
                        </p>
                        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                            You are the <strong>${positionText}</strong> in the <strong>${competition.title}</strong> competition!
                        </p>

                        <div style="background: #fafafa; padding: 32px 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
                            <p style="color: #666; margin-top: 0; font-size: 13px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Your Prize</p>
                            <h2 style="color: #42BE38; font-size: 24px; margin: 12px 0;">${prizeTitle}</h2>
                            <p style="color: #666; font-size: 15px; margin-bottom: 0;">Winning Ticket: <strong>${ticketCode}</strong></p>
                        </div>

                        <p style="color: #4a4a4a; font-size: 15px; line-height: 1.8; margin-bottom: 32px;">
                            Our team will be in touch with you shortly to arrange the delivery of your prize. You can view your winning details anytime in your profile under <strong>My Wins</strong>.
                        </p>

                        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 32px 0;" />
                        
                        <p style="color: #888; font-size: 14px; text-align: center; margin: 0;">
                            Enjoy your prize!<br/>
                            <strong>The DreamCar Competitions Team</strong>
                        </p>
                    </div>
                `;

                await sendEmail({
                    email: ticket.user.email,
                    subject: `You're a Winner! 🎉 - ${competition.title}`,
                    emailHtml
                });
            }
        } catch (emailErr) {
            console.error("Failed to send winner email:", emailErr);
        }

        return successResponse(res, "Winner assigned successfully", 200, result);

    } catch (error) {

        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.resetWinners = catchAsync(async (req, res) => {
    try {
        const { competitionId } = req.params;

        if (!competitionId) {
            return validationErrorResponse(res, "Competition ID is required");
        }

        // Check if there are any results
        const existingResults = await prisma.result.findMany({
            where: { competitionId: Number(competitionId) }
        });

        if (existingResults.length === 0) {
            return errorResponse(res, "No winners found to reset", 200);
        }

        // Delete results
        await prisma.result.deleteMany({
            where: { competitionId: Number(competitionId) }
        });

        return successResponse(res, "Winners reset successfully", 200);

    } catch (error) {
        console.error("Reset Winners Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.getUserWins = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        const wins = await prisma.result.findMany({
            where: { userId },
            include: {
                competition: {
                    select: {
                        id: true,
                        title: true,
                        images: true,
                        endTime: true,
                        productType: true,
                        prizes: true
                    },
                },
                ticket: {
                    select: {
                        ticketCode: true,
                        ticketNumber: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        if (!wins || wins.length === 0) {
            return errorResponse(res, "No winning entries found", 200, []);
        }

        const formatted = wins.map((w) => {
            // Find the specific prize for this position
            const wonPrize = w.competition.prizes?.find(p => p.position === w.position);

            return {
                id: w.id,
                title: wonPrize ? wonPrize.title : w.competition.title,
                image: wonPrize?.prizeDetailImage || w.competition.images?.[0],
                ticketCode: w.ticket?.ticketCode || `#${w.ticket?.ticketNumber || w.ticketId.slice(0, 6)}`,
                position: w.position,
                drawDate: w.competition.endTime,
                competitionId: w.competition.id,
                type: w.competition.productType
            };
        });

        return successResponse(res, "Wins fetched", 200, formatted);
    } catch (error) {
        console.error("User Winning competition Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.getAllAdminWinners = catchAsync(async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return errorResponse(res, "Unauthorized", 403);
        }

        const winners = await prisma.result.findMany({
            include: {
                competition: {
                    select: {
                        id: true,
                        title: true,
                        endTime: true,
                        prizes: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                ticket: {
                    select: {
                        ticketCode: true,
                        ticketNumber: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        if (!winners || winners.length === 0) {
            return successResponse(res, "No winners found", 200, []);
        }

        const data = winners.map(w => {
            const wonPrize = w.competition.prizes?.find(p => p.position === w.position);
            return {
                id: w.id,
                competitionId: w.competition.id,
                competitionTitle: w.competition.title,
                prizeTitle: wonPrize ? wonPrize.title : w.competition.title,
                winnerName: w.user.name,
                winnerEmail: w.user.email,
                ticketCode: w.ticket?.ticketCode || `#${w.ticket?.ticketNumber}`,
                position: w.position,
                date: w.createdAt,
                isManual: w.isManual
            };
        });

        return successResponse(res, "Winners fetched successfully", 200, data);

    } catch (error) {
        console.error("Get All Admin Winners Error:", error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getPublicWinners = catchAsync(async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const [winners, totalCount] = await Promise.all([
            prisma.result.findMany({
                where: {
                    position: 1
                },
                include: {
                    competition: {
                        select: {
                            id: true,
                            slug: true,
                            title: true,
                            images: true,
                            endTime: true,
                            prizes: true,
                            winnerDetail: {
                                select: {
                                    galleryImages: true
                                }
                            }
                        },
                    },
                    user: {
                        select: {
                            name: true,
                        },
                    },
                    ticket: {
                        select: {
                            ticketCode: true
                        }
                    },
                    winnerDetail: {
                        select : {
                            winnerImage : true
                        }
                    }

                },
                orderBy: {
                    createdAt: "desc",
                },
                skip: skip,
                take: limit,
            }),
            prisma.result.count({
                where: {
                    position: 1
                }
            })
        ]);

        if (!winners || winners.length === 0) {
            return successResponse(res, "No winners found", 200, {
                winners: [],
                pagination: {
                    totalItems: 0,
                    totalPages: 0,
                    currentPage: page,
                    limit: limit
                }
            });
        }

        const data = winners.map((w) => {
            const wonPrize = w.competition.prizes?.find(p => p.position === w.position);
            return {
                title: wonPrize ? wonPrize.title : w.competition.title,
                competitionId: w.competition.id,
                competitionTitle: w.competition.title,
                competitionSlug: w.competition.slug,
                prizeImage: wonPrize?.prizeDetailImage || '/img/car3d1.png',
                    competitionImages: w.competition.images || [],
                    galleryImages: w.competition.winnerDetail?.galleryImages || [],
                date: w.competition.endTime,
                winnerName: w.user.name,
                image: w.winnerImage || "/img/trophy.png",
                ticketCode: w.ticket?.ticketCode,
                position: w.position,
                winnerImage: w.winnerDetail?.winnerImage || ''
            };
        });

        return successResponse(res, "Winners fetched", 200, {
            winners: data,
            pagination: {
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                limit: limit
            }
        });
    } catch (error) {
        console.error("Public Winners Error:", error);
        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});


exports.getUserInstantWins = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        const instantWins = await prisma.instantWin.findMany({
            where: {
                claimedById: userId,
            },

            include: {
                competition: {
                    select: {
                        id: true,
                        title: true,
                        images: true,
                        endTime: true,
                    },
                },
                prize: {
                    select: {
                        title: true,
                        image: true,
                    },
                },
                ticket: {
                    select: {
                        ticketCode: true,
                    },
                },
            },
            orderBy: {
                claimedAt: "desc",
            },
        });

        if (!instantWins || instantWins.length === 0) {
            return successResponse(
                res,
                "No instant wins found",
                200,
                []
            );
        }

        const formatted = instantWins.map((w) => ({
            id: w.id,
            winType: "instant",
            competitionId: w.competition.id,
            competitionTitle: w.competition.title,
            title: w.prize.title,
            image:
                w.prize.image ||
                w.competition.images?.[0],
            ticketCode: w.ticket?.ticketCode || `#${w.ticketNumber}`,
            claimedAt: w.claimedAt,
            drawDate: w.competition.endTime,
            type: w.competition.productType,
            position: "Instant Win"
        }));

        return successResponse(
            res,
            "Instant wins fetched successfully",
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

exports.addWinnerDetail = catchAsync(async (req, res) => {
    try {
        // ADMIN CHECK
        if (req.user.role !== "admin") {
            return errorResponse(
                res,
                "Unauthorized",
                200
            );
        }

        const {
            competitionId, resultId, winnerName, winnerLocation, storyDescription } = req.body;

        // VALIDATION
        if (!competitionId || !resultId || !winnerName) {
            return errorResponse(
                res,
                "Required fields missing",
                200
            );
        }

        // CHECK COMPETITION
        const competition = await prisma.competition.findUnique({
            where: {
                id: parseInt(competitionId)
            },
            include: {
                results: true
            }
        });

        if (!competition) {
            return errorResponse(
                res,
                "Competition not found",
                200
            );
        }

        // CHECK RESULT
        const result = await prisma.result.findUnique({
            where: {
                id: resultId
            },
            include: {
                user: true,
                ticket: true
            }
        });

        if (!result) {
            return errorResponse(
                res,
                "Winner result not found",
                200
            );
        }

        // ONLY MAIN WINNER
        if (result.position !== 1) {
            return errorResponse(
                res,
                "Winner detail only allowed for main winner",
                200
            );
        }

        // CHECK EXISTING
        const existing = await prisma.winnerDetail.findUnique({
            where: {
                competitionId: parseInt(competitionId)
            }
        });

        const baseUrl = (process.env.BACKEND_PUBLIC_URL || process.env.DOMAIN || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

        // WINNER IMAGE
        let winnerImage = existing ? existing.winnerImage : null;
        if (req.files?.winnerImage?.[0]) {
            winnerImage = `${baseUrl}/uploads/${req.files.winnerImage[0].filename}`;
        } else if (req.body.existingWinnerImage === "") {
            winnerImage = null; // Removed existing image
        } else if (req.body.existingWinnerImage) {
            winnerImage = req.body.existingWinnerImage;
        }

        // GALLERY
        let galleryImages = [];
        
        // Retain existing gallery images if provided
        if (req.body.existingGalleryImages) {
            let parsedExisting = [];
            if (Array.isArray(req.body.existingGalleryImages)) {
                parsedExisting = req.body.existingGalleryImages;
            } else {
                try {
                    parsedExisting = JSON.parse(req.body.existingGalleryImages);
                } catch(e) {
                    if (typeof req.body.existingGalleryImages === 'string') {
                        parsedExisting = [req.body.existingGalleryImages];
                    }
                }
            }
            galleryImages = [...parsedExisting];
        }

        if (req.files?.galleryImages?.length) {
            const newGalleryImages = req.files.galleryImages.map(
                file => `${baseUrl}/uploads/${file.filename}`
            );
            galleryImages = [...galleryImages, ...newGalleryImages];
        }

        let detail;
        if (existing) {
            // UPDATE DETAIL
            detail = await prisma.winnerDetail.update({
                where: { competitionId: parseInt(competitionId) },
                data: {
                    winnerName,
                    winnerLocation,
                    storyDescription,
                    winnerImage,
                    galleryImages
                }
            });
        } else {
            // CREATE DETAIL
            detail = await prisma.winnerDetail.create({
                data: {
                    competitionId: parseInt(competitionId),
                    resultId,
                    winnerName,
                    winnerLocation,
                    storyDescription,
                    winnerImage,
                    galleryImages
                }
            });
        }

        return successResponse(
            res,
            "Winner detail added successfully",
            200,
            detail
        );

    } catch (error) {

        return errorResponse(
            res,
            error.message || "Internal Server Error",
            500
        );
    }
});

exports.getWinnerDetailPrefill = catchAsync(async (req, res) => {
    try {
        const { competitionId, resultId } = req.query;

        if (!competitionId || !resultId) {
            return errorResponse(
                res,
                "Missing ids",
                200
            );
        }

        const result = await prisma.result.findUnique({
            where: {
                id: resultId
            },
            include: {
                user: true,
                ticket: true,
                competition: {
                    include: {
                        prizes: true,
                        questions: true
                    }
                }
            }
        });

        if (!result) {
            return errorResponse(
                res,
                "Result not found",
                200
            );
        }

        // Check if winner detail already exists
        const existingDetail = await prisma.winnerDetail.findUnique({
            where: {
                competitionId: parseInt(competitionId)
            }
        });

        const wonPrize = result.competition.prizes.find(
            p => p.position === result.position
        );

        if (existingDetail) {
            return successResponse(
                res,
                "Winner detail fetched for editing",
                200,
                {
                    winnerName: existingDetail.winnerName,
                    winnerLocation: existingDetail.winnerLocation,
                    storyDescription: existingDetail.storyDescription,
                    winnerImage: existingDetail.winnerImage,
                    galleryImages: existingDetail.galleryImages || [],
                    
                    competitionTitle: result.competition.title,
                    winnerTicket: result.ticket.ticketCode,
                    prizeTitle: wonPrize?.title,
                    questions: result.competition.questions,
                    isEditing: true
                }
            );
        }

        return successResponse(
            res,
            "Winner prefill fetched",
            200,
            {
                winnerName: result.user.name,
                winnerLocation: "",
                competitionTitle: result.competition.title,
                winnerTicket: result.ticket.ticketCode,
                prizeTitle: wonPrize?.title,
                winnerImage: result.winnerImage,
                galleryImages: [],
                storyDescription: `${result.user.name} became the lucky winner of ${wonPrize?.title || result.competition.title} on DreamCar Competitions.`,
                questions: result.competition.questions,
                isEditing: false
            }
        );

    } catch (error) {
        return errorResponse(
            res,
            error.message,
            500
        );
    }
});

exports.getWinnerDetail = catchAsync(async (req, res) => {
    try {
        const {slug} = req.params;
        if (!slug) {
            return errorResponse(res,"Competition id required",200);
        }

        const competition = await prisma.competition.findUnique({
            where: { slug: slug },
        });

        const winnerDetail = await prisma.winnerDetail.findUnique({
            where: {
                competitionId: Number(competition?.id)
            },
            include: {
                competition: {
                    include: {
                        prizes: true,
                        questions: true
                    }
                },
                result: {
                    include: {
                        user: true,
                        ticket: true
                    }
                }
            }
        });

        if (!winnerDetail) {
            const result = await prisma.result.findFirst({
                where: {
                    competitionId: Number(competition?.id),
                    position: 1
                },
                include: {
                    competition: {
                        include: {
                            prizes: true,
                            questions: true
                        }
                    },
                    user: true,
                    ticket: true
                }
            });

            if (!competition || !result) {
                return errorResponse(
                    res,
                    "Winner detail not found",
                    200
                );
            }

            const mainPrize = result.competition.prizes.find(
                p => p.position === 1
            );

            const data = {
                competitionId: result.competitionId,
                competitionSlug: result.competition.slug,
                competitionTitle: result.competition.title,
                competitionDetail: result.competition.detail,
                competitionImages: result.competition.images,
                totalEntries: result.competition.soldTickets,
                totalTickets: result.competition.totalTickets,
                winnerName: result.user?.name,
                winnerLocation: "",
                storyDescription: "",
                winnerImage: result.winnerImage,
                galleryImages: [],
                createdAt: result.createdAt,
                ticketCode: result.ticket?.ticketCode,
                winnerJoinedAt: result.user?.createdAt,
                prize: mainPrize,
                complianceQuestions: result.competition.questions,
                isPrefill: true
            };

            return successResponse(
                res,
                "Winner detail fetched",
                200,
                data
            );
        }

        const mainPrize = winnerDetail.competition.prizes.find(
            p => p.position === 1
        );

        const data = {
            id: winnerDetail.id,
            competitionId: winnerDetail.competitionId,
            competitionSlug: winnerDetail.competition.slug,
            competitionTitle: winnerDetail.competition.title,
            competitionDetail: winnerDetail.competition.detail,
            competitionImages: winnerDetail.competition.images,
            totalEntries: winnerDetail.competition.soldTickets,
            totalTickets: winnerDetail.competition.totalTickets,
            winnerName: winnerDetail.winnerName,
            winnerLocation: winnerDetail.winnerLocation,
            storyDescription: winnerDetail.storyDescription,
            winnerImage: winnerDetail.winnerImage,
            galleryImages: winnerDetail.galleryImages,
            createdAt: winnerDetail.createdAt,
            ticketCode: winnerDetail.result.ticket
                ?.ticketCode,
            winnerJoinedAt: winnerDetail.result.user
                ?.createdAt,
            prize: mainPrize,
            complianceQuestions: winnerDetail.competition.questions
        };

        return successResponse(
            res,
            "Winner detail fetched",
            200,
            data
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

exports.getWinnerHighlights = catchAsync(async (req, res) => {
    try {
        const winners = await prisma.winnerDetail.findMany({
                where: {
                    deletedAt: null
                },
                include: {
                    competition: {
                        include: {
                            prizes: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                },
                take: 10
            });

        const formatted =
            winners.map((item) => {
                const mainPrize =
                    item.competition.prizes.find(
                        p => p.position === 1
                    );
                return {
                    competitionId: item.competitionId,
                    competitionSlug: item.competition.slug,
                    winnerName: item.winnerName,
                    winnerLocation: item.winnerLocation,
                    storyDescription: item.storyDescription,
                    winnerImage: item.winnerImage,
                    createdAt: item.createdAt,
                    prizeTitle: mainPrize?.title || item.competition.title
                };
            });
        return successResponse(
            res,
            "Winner highlights fetched",
            200,
            formatted
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
