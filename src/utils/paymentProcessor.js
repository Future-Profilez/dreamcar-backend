const prisma = require("../prismaconfig");
const { generateTicketCode } = require("./ticketCode");
const crypto = require("crypto");
const sendEmail = require("./EmailMailler");
const TicketPurchaseTemplate = require("../emailsTemplates/TicketPurchaseTemplate");
const { createAdminNotification } = require("./createAdminNotification");

const processWalletRecharge = async (session) => {
    const { userId, amount, type } = session.metadata;

    if (type !== "wallet_recharge") {
        return;
    }

    const parsedUserId = parseInt(userId);
    const parsedAmount = parseFloat(amount);

    if (!parsedUserId || !parsedAmount) {
        throw new Error("Invalid wallet recharge metadata");
    }

    await prisma.$transaction(async (tx) => {
        const existingTransaction = await tx.stripePayment.findFirst({
            where: {
                sessionId: session.id,
                type: "wallet_recharge"
            }
        });

        if (existingTransaction) {
            return;
        }

        // Create payment record
        const payment = await tx.stripePayment.create({
            data: {
                userId: parsedUserId,
                amount: parsedAmount,
                currency: session.currency?.toUpperCase() || "USD",
                status: "success",
                type: "wallet_recharge",
                stripePaymentId: session.payment_intent,
                sessionId: session.id,
            }
        });

        // Get or create wallet
        let wallet = await tx.wallet.findUnique({
            where: {
                userId: parsedUserId
            }
        });

        if (!wallet) {
            wallet = await tx.wallet.create({
                data: {
                    userId: parsedUserId,
                    balance: 0
                }
            });
        }

        // Update wallet balance
        const updatedWallet = await tx.wallet.update({
            where: {
                id: wallet.id
            },
            data: {
                balance: {
                    increment: parsedAmount
                }
            }
        });

        // Create wallet transaction
        await tx.walletTransaction.create({
            data: {
                walletId: wallet.id,
                userId: parsedUserId,
                type: "credit",
                amount: parsedAmount,
                balance: updatedWallet.balance,
                reason: "Wallet recharge via Stripe",
                stripePaymentId: payment.id
            }
        });

    });
};

const processSuccessfulPayment = async (session) => {
    const { userId, items, type } = session.metadata;

    if (type !== "competition_ticket" && type !== "gift_credit") {
        return;
    }

    const parsedUserId = parseInt(userId);
    let parsedItems = [];
    let txResult = null;
    try {
        parsedItems = items ? JSON.parse(items) : [];
    } catch (e) {
        console.error("JSON parse error:", items);
        throw new Error("Invalid metadata items");
    }

    for (const item of parsedItems) {
        //for gift credit
        if (item.itemType === "gift_credit") {
            const { giftType, recipientEmail, competitionName } = session.metadata || {};

            // Check if already processed to prevent duplicate gift cards
            const existingPayment = await prisma.stripePayment.findFirst({
                where: { sessionId: session.id, type: "gift_credit" }
            });

            if (existingPayment) {
                continue;
            }

            // create payment entry first
            const giftCreditPayment = await prisma.stripePayment.create({
                data: {
                    userId: parsedUserId,
                    amount: Number(item.itemId),
                    currency: session.currency?.toUpperCase() || "USD",
                    status: "success",
                    type: "gift_credit",
                    stripePaymentId: session.payment_intent,
                    sessionId: session.id,
                }
            });
            console.log("AMount in stripe webhookk ", giftCreditPayment);

            const generatedCode = await generateUniqueGiftCode();

            const giftCredit = await prisma.giftCredit.create({
                data: {
                    code: generatedCode,
                    amount: Number(item.itemId),
                    purchasedById: parsedUserId,
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
            });

            // Send Email
            try {
                const user = await prisma.user.findUnique({ where: { id: parsedUserId } });

                const targetEmail = recipientEmail || (user && user.email);
                const amount = item.itemId;

                if (targetEmail) {
                    let subject = "Your DreamCar Gift Card Code";
                    let emailHtml = "";

                    const codeStyle = "display: inline-block; padding: 16px 32px; background: #ffffff; color: #EC6623; font-size: 26px; font-weight: bold; letter-spacing: 2px; border-radius: 8px; border: 1px dashed #EC6623; margin: 16px 0;";

                    // if (giftType === "competition" && competitionName) {
                    //     subject = `You've been gifted a ticket for ${competitionName}! 🎁`;
                    //     emailHtml = `
                    //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #f0f0f0; border-radius: 16px; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                    //             <div style="text-align: center; margin-bottom: 32px;">
                    //             <img src="${(process.env.ASSET_BASE_URL || process.env.FRONTEND_URL || process.env.DOMAIN || "").replace(/\/$/, "")}/img/logoDC.png" alt="DreamCar Logo" style=" width: 220px; max-width: 100%; margin-bottom: 24px; object-fit: contain; " />    
                    //             <h1 style="color: #1a1a1a; margin: 0; display: inline-block; background-color: #cbe3ff; padding: 6px 12px; border-radius: 4px; font-size: 28px;">You've Got a Gift! 🎁</h1>
                    //             </div>

                    //             <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                    //                 Hi there,
                    //             </p>
                    //             <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                    //                 Great news! <strong>${user ? user.name : 'Someone'}</strong> has gifted you a ticket for the <strong>${competitionName}</strong> competition on DreamCar Competitions!
                    //             </p>

                    //             <div style="background: #fafafa; padding: 32px 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
                    //                 <p style="color: #666; margin-top: 0; font-size: 13px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Your Ticket Gift Code</p>
                    //                 <div style="${codeStyle}">${generatedCode}</div>
                    //                 <p style="color: #666; font-size: 15px; margin-bottom: 0;">Value: £${amount}</p>
                    //             </div>

                    //             <h3 style="color: #1a1a1a; font-size: 16px; margin-bottom: 16px;">How to claim your ticket:</h3>
                    //             <ol style="color: #4a4a4a; font-size: 15px; line-height: 1.8; padding-left: 20px; margin-bottom: 32px;">
                    //                 <li style="margin-bottom: 8px;">Go to <a href="${process.env.FRONTEND_URL || 'https://dreamcarcompetitions.com'}" style="color: #EC6623; text-decoration: underline;">DreamCar Competitions</a> and Log in / Register.</li>
                    //                 <li style="margin-bottom: 8px;">Visit your <strong>Profile > Gift Card</strong> section.</li>
                    //                 <li style="margin-bottom: 8px;">Enter your code to add the funds to your wallet.</li>
                    //                 <li>Use your wallet balance to enter the <strong>${competitionName}</strong> competition!</li>
                    //             </ol>

                    //             <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 32px 0;" />

                    //             <p style="color: #888; font-size: 14px; text-align: center; margin: 0;">
                    //                 Good luck!<br/>
                    //                 <strong>The DreamCar Competitions Team</strong>
                    //             </p>
                    //         </div>
                    //     `;
                    // } else {
                    //     subject = "Your DreamCar Gift Card Code 🎁";
                    //     emailHtml = `
                    //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #f0f0f0; border-radius: 16px; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                    //             <div style="text-align: center; margin-bottom: 32px;">
                    //             <img src="${(process.env.ASSET_BASE_URL || process.env.FRONTEND_URL || process.env.DOMAIN || "").replace(/\/$/, "")}/img/logoDC.png" alt="DreamCar Logo" style=" width: 220px; max-width: 100%; margin-bottom: 24px; object-fit: contain; " />    
                    //             <h1 style="color: #1a1a1a; margin: 0; display: inline-block; background-color: #cbe3ff; padding: 6px 12px; border-radius: 4px; font-size: 28px;">DreamCar Gift Card 💳</h1>
                    //             </div>

                    //             <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                    //                 Hi ${user ? user.name : 'there'},
                    //             </p>
                    //             <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                    //                 Thank you for purchasing a DreamCar Gift Card! You can use this code to add funds to your wallet or share it with a friend.
                    //             </p>

                    //             <div style="background: #fafafa; padding: 32px 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
                    //                 <p style="color: #666; margin-top: 0; font-size: 13px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Your Gift Code</p>
                    //                 <div style="${codeStyle}">${generatedCode}</div>
                    //                 <p style="color: #666; font-size: 15px; margin-bottom: 0;">Value: £${amount}</p>
                    //             </div>

                    //             <p style="color: #4a4a4a; font-size: 15px; line-height: 1.8; margin-bottom: 32px;">
                    //                 <strong>To redeem:</strong> Log in to your account, go to the <strong>Gift Card</strong> section in your profile, and enter this code.
                    //             </p>

                    //             <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 32px 0;" />

                    //             <p style="color: #888; font-size: 14px; text-align: center; margin: 0;">
                    //                 Thank you for choosing us!<br/>
                    //                 <strong>The DreamCar Competitions Team</strong>
                    //             </p>
                    //         </div>
                    //     `;
                    // }
                    if (giftType === "competition" && competitionName) {

                        subject = `You've been gifted a ticket for ${competitionName}! 🎁`;

                        emailHtml = `
    
    <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 18px;
        overflow: hidden;
    ">

        <!-- HEADER -->
        <div style="
            background:#000000;
            padding:40px 30px;
            text-align:center;
        ">

            <img 
                src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75"
                alt="DreamCar Logo"
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                "
            />

            <h1 style="
                color:#ffffff;
                font-size:32px;
                margin:0;
                font-weight:700;
            ">
                You've Got a Gift! 🎁
            </h1>

            <p style="
                color:#bdbdbd;
                margin-top:12px;
                font-size:15px;
                line-height:1.6;
            ">
                Someone gifted you a competition entry.
            </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px 30px;">

            <p style="
                color:#444444;
                font-size:16px;
                line-height:1.8;
                margin-top:0;
                margin-bottom:18px;
            ">
                Hi there,
            </p>

            <p style="
                color:#555555;
                font-size:15px;
                line-height:1.8;
                margin-bottom:30px;
            ">
                <strong>${user ? user.name : 'Someone'}</strong>
                has gifted you a ticket for
                <strong>${competitionName}</strong>
                on DreamCar Competitions.
            </p>

            <!-- GIFT CODE -->
            <div style="
                background:#fafafa;
                border:1px solid #eeeeee;
                border-radius:16px;
                padding:34px 24px;
                text-align:center;
                margin-bottom:30px;
            ">

                <p style="
                    margin-top:0;
                    margin-bottom:18px;
                    color:#666666;
                    font-size:13px;
                    font-weight:700;
                    letter-spacing:1px;
                    text-transform:uppercase;
                ">
                    Your Gift Code
                </p>

                <div style="
                    display:inline-block;
                    background:#ffffff;
                    border:2px dashed #EC6623;
                    border-radius:14px;
                    padding:18px 30px;
                    font-size:32px;
                    font-weight:700;
                    letter-spacing:6px;
                    color:#111111;
                ">
                    ${generatedCode}
                </div>

                <p style="
                    margin-bottom:0;
                    margin-top:20px;
                    color:#888888;
                    font-size:14px;
                ">
                    Gift Value: £${amount}
                </p>

            </div>

            <!-- STEPS -->
            <div style="
                background:#fafafa;
                border:1px solid #eeeeee;
                border-radius:16px;
                padding:24px;
                margin-bottom:30px;
            ">

                <h3 style="
                    margin-top:0;
                    color:#111111;
                    font-size:18px;
                    margin-bottom:18px;
                ">
                    How to Redeem
                </h3>

                <ol style="
                    color:#555555;
                    font-size:15px;
                    line-height:1.9;
                    padding-left:20px;
                    margin:0;
                ">
                    <li>Login or register on DreamCar Competitions</li>
                    <li>Open your Profile → Gift Card section</li>
                    <li>Enter the code above</li>
                    <li>Use your wallet balance for competition entries</li>
                </ol>

            </div>

            <p style="
                color:#666666;
                font-size:14px;
                line-height:1.8;
                margin-bottom:0;
            ">
                Good luck and enjoy your competition entry experience.
            </p>

        </div>

        <!-- FOOTER -->
        <div style="
            border-top:1px solid #eeeeee;
            padding:24px;
            text-align:center;
            background:#fafafa;
        ">

            <p style="
                margin:0;
                color:#888888;
                font-size:13px;
                line-height:1.8;
            ">
                Dream big, drive bigger. <br/>
                <strong>DreamCar Competitions</strong>
            </p>

        </div>

    </div>

    `;

                    } else {

                        subject = "Your DreamCar Gift Card Code 🎁";

                        emailHtml = `
    
    <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e5e5;
        border-radius: 18px;
        overflow: hidden;
    ">

        <!-- HEADER -->
        <div style="
            background:#000000;
            padding:40px 30px;
            text-align:center;
        ">

            <img 
                src="https://fp-dreamcar.vercel.app/_next/image?url=%2Fimg%2FlogoDC.png&w=128&q=75"
                alt="DreamCar Logo"
                style="
                    width:220px;
                    max-width:100%;
                    margin-bottom:24px;
                "
            />

            <h1 style="
                color:#ffffff;
                font-size:32px;
                margin:0;
                font-weight:700;
            ">
                DreamCar Gift Card 💳
            </h1>

            <p style="
                color:#bdbdbd;
                margin-top:12px;
                font-size:15px;
                line-height:1.6;
            ">
                Your gift credit is ready to use.
            </p>

        </div>

        <!-- BODY -->
        <div style="padding:40px 30px;">

            <p style="
                color:#444444;
                font-size:16px;
                line-height:1.8;
                margin-top:0;
                margin-bottom:18px;
            ">
                Hi ${user ? user.name : 'there'},
            </p>

            <p style="
                color:#555555;
                font-size:15px;
                line-height:1.8;
                margin-bottom:30px;
            ">
                Thank you for purchasing a DreamCar Gift Card.
                You can redeem this code yourself or share it with someone special.
            </p>

            <!-- CODE BOX -->
            <div style="
                background:#fafafa;
                border:1px solid #eeeeee;
                border-radius:16px;
                padding:34px 24px;
                text-align:center;
                margin-bottom:30px;
            ">

                <p style="
                    margin-top:0;
                    margin-bottom:18px;
                    color:#666666;
                    font-size:13px;
                    font-weight:700;
                    letter-spacing:1px;
                    text-transform:uppercase;
                ">
                    Your Gift Code
                </p>

                <div style="
                    display:inline-block;
                    background:#ffffff;
                    border:2px dashed #EC6623;
                    border-radius:14px;
                    padding:18px 30px;
                    font-size:32px;
                    font-weight:700;
                    letter-spacing:6px;
                    color:#111111;
                ">
                    ${generatedCode}
                </div>

                <p style="
                    margin-bottom:0;
                    margin-top:20px;
                    color:#888888;
                    font-size:14px;
                ">
                    Gift Value: £${amount}
                </p>

            </div>

            <p style="
                color:#666666;
                font-size:14px;
                line-height:1.8;
                margin-bottom:0;
            ">
                Redeem this code inside your account under the Gift Card section.
            </p>

        </div>

        <!-- FOOTER -->
        <div style="
            border-top:1px solid #eeeeee;
            padding:24px;
            text-align:center;
            background:#fafafa;
        ">

            <p style="
                margin:0;
                color:#888888;
                font-size:13px;
                line-height:1.8;
            ">
                Thank you for choosing us. <br/>
                <strong>DreamCar Competitions</strong>
            </p>

        </div>

    </div>

    `;
                    }
                    await sendEmail({
                        email: targetEmail,
                        subject: subject,
                        emailHtml
                    });
                }
            } catch (emailErr) {
                console.error("Failed to send gift card email:", emailErr);
            }

            continue;
        }

        txResult = await prisma.$transaction(async (tx) => {
            const parsedCompetitionId = parseInt(item.itemId);  //changed from competitionId
            const parsedQty = parseInt(item.quantity);
            const answer = item.answer;

            // Lock the competition row to prevent race conditions (double processing)
            await tx.$executeRaw`SELECT id FROM "Competition" WHERE id = ${parsedCompetitionId} FOR UPDATE`;

            // Check if payment already exists to prevent duplicate processing
            const existingPayment = await tx.stripePayment.findFirst({
                where: { sessionId: session.id, competitionId: parsedCompetitionId }
            });

            if (existingPayment) {
                return null; // Already processed
            }

            const competition = await tx.competition.findUnique({
                where: { id: parsedCompetitionId },
                select: {
                    id: true,
                    title: true,
                    soldTickets: true,
                    ticketPrice: true,
                    images: true
                }
            });
            // 1. Create Payment Record
            const payment = await tx.stripePayment.create({
                data: {
                    userId: parsedUserId,
                    competitionId: parsedCompetitionId,
                    // amount: session.amount_total / 100,
                    amount: parsedQty * Number(competition.ticketPrice),
                    currency: session.currency,
                    status: "success",
                    type: "competition",
                    stripePaymentId: session.payment_intent,
                    sessionId: session.id,
                    quantity: parsedQty
                }
            });

            if (!competition) {
                throw new Error("Competition not found");
            }

            // 3. Check Answer
            const question = await tx.complianceQuestion.findFirst({
                where: { competitionId: parsedCompetitionId }
            });

            const isCorrect = question?.answers?.includes(answer);

            // 4. UPDATE SOLD TICKETS FIRST
            const updatedCompetition = await tx.competition.update({
                where: { id: parsedCompetitionId },
                data: {
                    soldTickets: {
                        increment: parsedQty
                    }
                }
            });

            // 5. Generate ticket numbers safely + check wins
            const startNumber = updatedCompetition.soldTickets - parsedQty + 1;
            const ticketsData = [];
            const instantWinUpdates = [];
            const wonInstantWinsList = [];

            // Pre-fetch all potential instant wins for these ticket numbers to avoid querying in loop
            const potentialWins = await tx.instantWin.findMany({
                where: {
                    competitionId: parsedCompetitionId,
                    ticketNumber: {
                        gte: startNumber,
                        lt: startNumber + parsedQty
                    }
                },
                include: {
                    prize: true
                }
            });

            const instantWinsMap = new Map(
                potentialWins.map(w => [w.ticketNumber, w])
            );

            for (let i = 0; i < parsedQty; i++) {
                const ticketNumber = startNumber + i;
                const ticketCode = generateTicketCode(parsedCompetitionId, ticketNumber);

                const instantWin = instantWinsMap.get(ticketNumber);

                let isInstantWin = false;

                if (instantWin && !instantWin.isClaimed) {
                    isInstantWin = true;
                    instantWinUpdates.push({ id: instantWin.id });
                    wonInstantWinsList.push({
                        ...instantWin,
                        ticketCode
                    });
                }

                ticketsData.push({
                    userId: parsedUserId,
                    competitionId: parsedCompetitionId,
                    paymentId: payment.id,
                    ticketNumber,
                    ticketCode,
                    isEligible: isCorrect,
                    isInstantWin,
                });
            }

            // 6. Create tickets
            await tx.ticket.createMany({
                data: ticketsData
            });

            // 7. Claim instant wins
            for (const win of instantWinUpdates) {
                await tx.instantWin.update({
                    where: { id: win.id },
                    data: {
                        isClaimed: true,
                        claimedById: parsedUserId,
                        claimedAt: new Date(),
                    },
                });
            }

            return { wonInstantWinsList, competition, payment };
        },
            {
                timeout: 20000
            }
        );
        //sending mail for ticket purchase
        if (txResult) {
            try {
                const user = await prisma.user.findUnique({ where: { id: parsedUserId } });
                const paymentTickets = await prisma.ticket.findMany({ where: { paymentId: txResult.payment.id } });
                sendEmail({
                    email: user.email, subject: `Your Tickets for ${txResult.competition.title} 🎟️`, emailHtml:
                        TicketPurchaseTemplate({
                            user,
                            competition: txResult.competition,
                            tickets: paymentTickets,
                            amount: paymentTickets.length * Number(txResult.competition.ticketPrice),
                            instantWins: txResult.wonInstantWinsList || []
                        })
                });
            } catch (emailErr) {
                console.error("Ticket email failed:", emailErr);
            }
        }
        // Send Instant Win Emails
        if (txResult && txResult.wonInstantWinsList && txResult.wonInstantWinsList.length > 0) {
            try {
                const user = await prisma.user.findUnique({ where: { id: parsedUserId } });
                if (user && user.email) {
                    for (const win of txResult.wonInstantWinsList) {
                        const prizeTitle = win.prize ? win.prize.title : "an Instant Prize";
                        const ticketCode = win.ticketCode;
                        const competitionName = txResult.competition.title;

                        await createAdminNotification({
                            key: `instant-win-awarded-${win.id}`,
                            type: "instant_win_awarded",
                            title: "Instant Win Awarded",
                            message: `${user.name} won ${prizeTitle} in ${competitionName} (Ticket ${ticketCode}).`,
                            meta: {
                                competitionId: txResult.competition.id,
                                userId: user.id,
                                instantWinId: win.id,
                                prizeTitle,
                                ticketCode
                            }
                        });
                    }

                    const remaining = await prisma.instantWin.count({
                        where: {
                            competitionId: txResult.competition.id,
                            isClaimed: false
                        }
                    });

                    if (remaining === 0) {
                        await createAdminNotification({
                            key: `instant-win-all-claimed-${txResult.competition.id}`,
                            type: "instant_win_ended",
                            title: "Instant Win Ended",
                            message: `All instant win prizes have been claimed for ${txResult.competition.title}.`,
                            meta: { competitionId: txResult.competition.id }
                        });
                    }

                    for (const win of txResult.wonInstantWinsList) {
                        const prizeTitle = win.prize ? win.prize.title : 'an Instant Prize';
                        const ticketCode = win.ticketCode;
                        const competitionName = txResult.competition.title;

                        const emailHtml = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #f0f0f0; border-radius: 16px; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                                <div style="text-align: center; margin-bottom: 32px;">
                                    <h1 style="color: #1a1a1a; margin: 0; display: inline-block; background-color: #e6ffe6; padding: 6px 12px; border-radius: 4px; font-size: 28px;">Congratulations! 🎉</h1>
                                </div>
                                
                                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                                    Hi ${user.name},
                                </p>
                                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                                    You've just won an <strong>Instant Win</strong> in the <strong>${competitionName}</strong> competition!
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
                            email: user.email,
                            subject: `You've Won an Instant Prize! 🎉 - ${competitionName}`,
                            emailHtml
                        });
                    }
                }
            } catch (emailErr) {
                console.error("Failed to send instant win email:", emailErr);
            }
        }
    }

    if (txResult && txResult.competition && txResult.competition.id) {
        try {
            const comp = await prisma.competition.findUnique({
                where: { id: txResult.competition.id },
                select: { id: true, title: true, soldTickets: true, totalTickets: true }
            });

            if (comp && comp.soldTickets >= comp.totalTickets) {
                await createAdminNotification({
                    key: `competition-sold-out-${comp.id}`,
                    type: "competition_sold_out",
                    title: "Tickets Sold Out",
                    message: `${comp.title} is now sold out.`,
                    meta: { competitionId: comp.id }
                });
            }
        } catch (notifyErr) {
        }
    }

    // 8. CLEAR USER CART
    try {
        const userCart = await prisma.cart.findUnique({
            where: { userId: parsedUserId }
        });
        if (userCart) {
            await prisma.cartItem.deleteMany({
                where: { cartId: userCart.id }
            });
        }
    } catch (err) {
        console.error("Failed to clear cart:", err);
    }
};

async function generateUniqueGiftCode() {

    let code;
    let exists = true;

    while (exists) {
        // Generating a longer code: DRM-XXXX-XXXX-XXXX-XXXX-XXXX
        code =
            "DRM-" +
            crypto.randomBytes(2).toString("hex").toUpperCase() +
            "-" +
            crypto.randomBytes(2).toString("hex").toUpperCase() +
            "-" +
            crypto.randomBytes(2).toString("hex").toUpperCase() +
            "-" +
            crypto.randomBytes(2).toString("hex").toUpperCase() +
            "-" +
            crypto.randomBytes(2).toString("hex").toUpperCase();

        exists = await prisma.giftCredit.findUnique({
            where: { code }
        });
    }

    return code;
}

module.exports = { processSuccessfulPayment, processWalletRecharge };
