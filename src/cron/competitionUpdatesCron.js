const cron = require('node-cron');
const prisma = require('../prismaconfig');
const Loggers = require('../utils/Logger');
const { sendCompetitionUpdateEmails } = require('../utils/competitionEmails');

async function processCompetitionUpdates() {
    try {

        const now = new Date();

        // 1. Find newly started competitions (started, not ended, email not sent)
        const newCompetitions = await prisma.competition.findMany({
            where: {
                status: 1,
                deletedAt: null,
                startTime: { lte: now },
                endTime: { gt: now },
                newEmailSent: 0
            }
        });

        // 2. Find competitions ending soon (ending within next 4 hours, tickets available, email not sent)
        const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        
        const endingCompetitionsAll = await prisma.competition.findMany({
            where: {
                status: 1,
                deletedAt: null,
                endTime: { gt: now, lte: fourHoursFromNow },
                endingEmailSent: 0
            }
        });

        // Filter out sold out competitions
        const endingCompetitions = endingCompetitionsAll.filter(c => c.soldTickets < c.totalTickets);

        if (newCompetitions.length === 0 && endingCompetitions.length === 0) {

            return { status: true, message: "No updates to send" };
        }

        // 3 & 4. Resolve audience + send via shared helper (also used by the
        // admin manual-resend endpoint).
        const { sent: sentCount, recipients } = await sendCompetitionUpdateEmails({
            newCompetitions,
            endingCompetitions
        });

        if (recipients === 0) {
            return { status: true, message: "No subscribers found" };
        }

        // 5. Mark as sent
        if (newCompetitions.length > 0) {
            await prisma.competition.updateMany({
                where: { id: { in: newCompetitions.map(c => c.id) } },
                data: { newEmailSent: 1 }
            });
        }

        if (endingCompetitions.length > 0) {
            await prisma.competition.updateMany({
                where: { id: { in: endingCompetitions.map(c => c.id) } },
                data: { endingEmailSent: 1 }
            });
        }

        Loggers.info(`Cron: Competition updates sent successfully to ${sentCount} users.`);
        
        return { status: true, message: `Sent to ${sentCount} users` };

    } catch (error) {
        const message = error?.message || String(error);
        Loggers.error(`Cron Error (CompetitionUpdates): ${message}`);
        console.error(`Cron Error (CompetitionUpdates):`, error);
        throw error;
    }
}

// Run every hour to check for new or ending competitions
cron.schedule('0 * * * *', () => {
    processCompetitionUpdates().catch(console.error);
});

module.exports = { processCompetitionUpdates };