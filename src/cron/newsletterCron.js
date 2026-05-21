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

            console.log(
                "Running weekly newsletter..."
            );

            // GET SUBSCRIBERS

            const subscribers =
                await prisma.newsletter.findMany();

            if (!subscribers.length) {

                console.log(
                    "No newsletter subscribers"
                );

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

                console.log(
                    "No competitions found"
                );

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

                    console.log(
                        `Newsletter sent to ${sub.email}`
                    );

                } catch (mailError) {

                    console.log(
                        `Failed for ${sub.email}`,
                        mailError.message
                    );
                }
            }

            console.log(
                "Weekly newsletter completed"
            );

        } catch (error) {

            console.log(
                "Newsletter cron error:",
                error
            );
        }
    }
);