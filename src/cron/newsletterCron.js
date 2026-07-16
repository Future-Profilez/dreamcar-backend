const cron = require("node-cron");

const prisma =
    require("../prismaconfig");
const sendEmail = require("../utils/EmailMailler");
const WeeklyCompetitionTemplate = require("../emailsTemplates/WeeklyCompetitionTemplate");


// Every Monday at 10:00 AM

cron.schedule(
    "0 10 * * 1",
    // "* * * * *",
    async () => {

        try {

            // GET SUBSCRIBERS

            const subscribers =
                await prisma.newsletter.findMany();

            if (!subscribers.length) {

                return;
            }

            // GET LATEST COMPETITIONS

            const competitions =
                await prisma.competition.findMany({

                    where: {
                        deletedAt: null
                    },

                    orderBy: {
                        createdAt: "desc"
                    },

                    take: 5
                });

            if (!competitions.length) {

                return;
            }

            // SEND MAILS

            for (const sub of subscribers) {

                try {

                    await sendEmail({

                        email: sub.email,

                        subject:
                            "🔥 Latest DreamCar Competitions",

                        emailHtml:
                            WeeklyCompetitionTemplate({
                                competitions
                            })
                    });

                } catch (mailError) {

                }
            }

        } catch (error) {

        }
    }
);