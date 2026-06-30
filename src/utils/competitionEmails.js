// Shared competition-marketing email logic used by both crons and the admin
// manual-resend endpoint. Keeps audience + send behaviour in one place.
const prisma = require('../prismaconfig');
const sendEmail = require('./EmailMailler');
const CompetitionUpdatesTemplate = require('../emailsTemplates/CompetitionUpdatesTemplate');
const CompetitionEndedTemplate = require('../emailsTemplates/CompetitionEndedTemplate');

// Marketing audience: opted-in users (marketingEmails = 1) + newsletter
// subscribers, deduped by email. User records win so we keep the name.
async function getMarketingAudience() {
    const [users, subs] = await Promise.all([
        prisma.user.findMany({
            where: { marketingEmails: 1, deletedAt: null },
            select: { email: true, name: true }
        }),
        prisma.newsletter.findMany({
            where: { deletedAt: null },
            select: { email: true }
        })
    ]);

    const map = new Map();
    for (const u of users) {
        if (u.email) map.set(u.email.toLowerCase(), { email: u.email, name: u.name || '' });
    }
    for (const s of subs) {
        if (s.email && !map.has(s.email.toLowerCase())) {
            map.set(s.email.toLowerCase(), { email: s.email, name: '' });
        }
    }
    return Array.from(map.values());
}

function buildUpdates(newCompetitions, endingCompetitions) {
    const updates = [];
    for (const c of newCompetitions) updates.push({ title: c.title, message: 'Now live — entries are open!' });
    for (const c of endingCompetitions) updates.push({ title: c.title, message: 'Ending soon — grab your tickets before it closes!' });
    return updates;
}

// Send the "new / ending soon" competition update email to the marketing
// audience. Pass either/both buckets. Returns { sent, failed, recipients }.
async function sendCompetitionUpdateEmails({ newCompetitions = [], endingCompetitions = [], audience } = {}) {
    const updates = buildUpdates(newCompetitions, endingCompetitions);
    if (!updates.length) return { sent: 0, failed: 0, recipients: 0, message: 'No competitions to send' };

    const recipients = audience || await getMarketingAudience();
    if (!recipients.length) return { sent: 0, failed: 0, recipients: 0, message: 'No subscribers found' };

    let sent = 0, failed = 0;
    for (const r of recipients) {
        try {
            await sendEmail({
                email: r.email,
                subject: 'DreamCar: New Competitions & Ending Soon Alerts! 🚗',
                emailHtml: CompetitionUpdatesTemplate({ name: r.name }, updates)
            });
            sent++;
        } catch (err) {
            failed++;
            console.error(`Failed to send update email to ${r.email}:`, err?.message || err);
        }
    }
    return { sent, failed, recipients: recipients.length };
}

// Send the "competition ended (+ winner)" email to the marketing audience.
// Returns { sent, failed, recipients, winner }.
async function sendCompetitionEndedEmails({ competition, audience } = {}) {
    if (!competition) return { sent: 0, failed: 0, recipients: 0, message: 'No competition provided' };

    const recipients = audience || await getMarketingAudience();
    if (!recipients.length) return { sent: 0, failed: 0, recipients: 0, message: 'No subscribers found' };

    // Resolve winner: WinnerDetail (richest) → 1st-place Result user → none.
    const [winnerDetail, winnerResult] = await Promise.all([
        prisma.winnerDetail.findUnique({ where: { competitionId: competition.id } }),
        prisma.result.findFirst({
            where: { competitionId: competition.id, position: 1 },
            include: { user: { select: { name: true } } }
        })
    ]);

    const winner = {
        name: winnerDetail?.winnerName || winnerResult?.user?.name || null,
        location: winnerDetail?.winnerLocation || null,
        image: winnerDetail?.winnerImage || winnerResult?.winnerImage || null
    };

    let sent = 0, failed = 0;
    for (const r of recipients) {
        try {
            await sendEmail({
                email: r.email,
                subject: `🏁 ${competition.title} has ended — winner announced!`,
                emailHtml: CompetitionEndedTemplate({ name: r.name }, competition, winner)
            });
            sent++;
        } catch (err) {
            failed++;
            console.error(`Failed to send ended email to ${r.email}:`, err?.message || err);
        }
    }
    return { sent, failed, recipients: recipients.length, winner: winner.name };
}

module.exports = { getMarketingAudience, sendCompetitionUpdateEmails, sendCompetitionEndedEmails };
