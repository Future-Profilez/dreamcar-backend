const cron = require("node-cron");
const prisma = require("../prismaconfig");
const Loggers = require("../utils/Logger");
const { trackEvent, formatCompetitionFields } = require("../utils/klaviyoService");

/**
 * Checks for competitions closing in 24 hours and 2 hours
 * Dispatches "Competition Closing Soon" to users who carted or reserved tickets in the past 14 days without purchasing.
 */
async function processCompetitionClosingSoon() {
    try {
        const now = new Date();
        const activeCompetitions = await prisma.competition.findMany({
            where: {
                status: 1,
                deletedAt: null,
                endTime: { gt: now }
            }
        });

        for (const comp of activeCompetitions) {
            if (comp.soldTickets >= comp.totalTickets) continue;

            const timeRemainingMs = new Date(comp.endTime).getTime() - now.getTime();
            const hoursRemainingExact = timeRemainingMs / (1000 * 60 * 60);

            let triggerHour = null;
            // 24-hour warning (between 23.5 and 24.5 hours remaining)
            if (hoursRemainingExact >= 23.5 && hoursRemainingExact <= 24.5) {
                triggerHour = 24;
            }
            // 2-hour warning (between 1.5 and 2.5 hours remaining)
            else if (hoursRemainingExact >= 1.5 && hoursRemainingExact <= 2.5) {
                triggerHour = 2;
            }

            if (!triggerHour) continue;

            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            // Find users who added this competition to cart in the last 14 days
            const cartItems = await prisma.cartItem.findMany({
                where: {
                    itemId: comp.id,
                    itemType: "competition"
                },
                include: {
                    cart: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            // Find users with reservations in the last 14 days
            const reservations = await prisma.ticketReservation.findMany({
                where: {
                    competitionId: comp.id,
                    createdAt: { gte: fourteenDaysAgo }
                }
            });

            const candidateUserIds = new Set();
            for (const ci of cartItems) {
                if (ci.cart?.user?.id) candidateUserIds.add(ci.cart.user.id);
            }
            for (const r of reservations) {
                if (r.userId) candidateUserIds.add(r.userId);
            }

            if (candidateUserIds.size === 0) continue;

            const compFields = formatCompetitionFields(comp);
            const ticketsRemaining = comp.totalTickets - comp.soldTickets;

            for (const userId of candidateUserIds) {
                // Check if user has already bought tickets for this competition
                const existingTicket = await prisma.ticket.findFirst({
                    where: {
                        userId,
                        competitionId: comp.id
                    }
                });

                if (existingTicket) {
                    continue; // Skip: user already bought tickets!
                }

                const user = await prisma.user.findUnique({
                    where: { id: userId }
                });

                if (!user || !user.email) continue;

                const eventUniqueId = `comp_closing_${comp.id}_${triggerHour}_${user.id}`;

                await trackEvent({
                    metricName: "Competition Closing Soon",
                    profile: {
                        email: user.email,
                        external_id: String(user.memberNumber || user.id),
                        member_number: user.memberNumber || user.id,
                        phone: user.phone,
                        first_name: user.name?.split(" ")[0],
                        last_name: user.name?.split(" ").slice(1).join(" ")
                    },
                    properties: {
                        ...compFields,
                        hours_remaining: triggerHour,
                        tickets_remaining: ticketsRemaining,
                        unique_id: `${comp.id}_${triggerHour}`
                    },
                    uniqueId: eventUniqueId
                });
            }
        }
    } catch (error) {
        Loggers.error(`Klaviyo Competition Closing Soon Cron error: ${error.message}`);
    }
}

/**
 * Checks for newly live competitions and triggers "Competition Launched"
 */
async function processCompetitionLaunched() {
    try {
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

        // Competitions that launched in the last 15 minutes
        const newlyLaunched = await prisma.competition.findMany({
            where: {
                status: 1,
                deletedAt: null,
                startTime: { gte: tenMinutesAgo, lte: now }
            }
        });

        for (const comp of newlyLaunched) {
            const compFields = formatCompetitionFields(comp);
            const uniqueId = `${comp.id}_launched`;

            // Broadcast Competition Launched to newsletter / subscribers
            const subscribers = await prisma.newsletter.findMany({
                where: { deletedAt: null },
                take: 100
            });

            for (const sub of subscribers) {
                if (!sub.email) continue;
                await trackEvent({
                    metricName: "Competition Launched",
                    profile: {
                        email: sub.email
                    },
                    properties: {
                        ...compFields,
                        unique_id: uniqueId
                    },
                    uniqueId: `${uniqueId}_${sub.id}`
                });
            }
        }
    } catch (error) {
        Loggers.error(`Klaviyo Competition Launched Cron error: ${error.message}`);
    }
}

// Run every 15 minutes
cron.schedule("*/15 * * * *", async () => {
    await processCompetitionClosingSoon();
    await processCompetitionLaunched();
});

module.exports = {
    processCompetitionClosingSoon,
    processCompetitionLaunched
};
