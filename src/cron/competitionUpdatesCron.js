const cron = require('node-cron');
const prisma = require('../prismaconfig');
const Loggers = require('../utils/Logger');
const sendEmail = require('../utils/EmailMailler');
const CompetitionUpdatesTemplate = require('../emailsTemplates/CompetitionUpdatesTemplate');

async function processCompetitionUpdates() {
    try {
        console.log(`Cron: Competition updates check started...`);
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
            console.log(`Cron: No new or ending competitions to notify about.`);
            return { status: true, message: "No updates to send" };
        }

        console.log(`Found ${newCompetitions.length} new and ${endingCompetitions.length} ending competitions.`);

        // 3. Get target audience (Users with marketingEmails = 1 + Newsletter subscribers)
        const optedInUsers = await prisma.user.findMany({
            where: { marketingEmails: 1, deletedAt: null },
            select: { email: true }
        });

        const newsletterSubscribers = await prisma.newsletter.findMany({
            where: { deletedAt: null },
            select: { email: true }
        });

        // Merge and deduplicate emails
        const allEmails = new Set([
            ...optedInUsers.map(u => u.email),
            ...newsletterSubscribers.map(n => n.email)
        ]);

        const emailList = Array.from(allEmails);

        if (emailList.length === 0) {
            console.log(`Cron: No subscribed users found.`);
            return { status: true, message: "No subscribers found" };
        }

        // 4. Send Emails
        const emailHtml = CompetitionUpdatesTemplate(newCompetitions, endingCompetitions);
        
        let sentCount = 0;
        // In a real production environment, you might want to use a queue or batch this.
        // For now, we'll loop through (or use BCC if list is small, but looping is safer for personalized unsubscribe links in future)
        for (const email of emailList) {
            try {
                await sendEmail({
                    email,
                    subject: "DreamCar: New Competitions & Ending Soon Alerts! 🚗",
                    emailHtml
                });
                sentCount++;
            } catch (err) {
                console.error(`Failed to send update email to ${email}:`, err);
            }
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

        console.log(`Cron: Updates sent to ${sentCount} subscribers.`);
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