const catchAsync = require('../utils/catchAsync');
const prisma = require('../prismaconfig');
const { successResponse, errorResponse } = require('../utils/ErrorHandling');
const { sendCompetitionUpdateEmails, sendCompetitionEndedEmails } = require('../utils/competitionEmails');
const { createAdminNotification } = require('../utils/createAdminNotification');

const VALID_TYPES = ['new', 'ending', 'ended'];

// POST /api/admin/marketing/competition-email
// Body: { competitionId, type: 'new' | 'ending' | 'ended' }
// Admin manual (re)send. Ignores newEmailSent/endingEmailSent gating (force).
exports.resendCompetitionEmail = catchAsync(async (req, res) => {
    const { competitionId, type } = req.body;

    if (!competitionId || !VALID_TYPES.includes(type)) {
        return errorResponse(res, "competitionId and a valid type ('new' | 'ending' | 'ended') are required", 400);
    }

    const competition = await prisma.competition.findFirst({
        where: { id: Number(competitionId), deletedAt: null },
        select: { id: true, title: true, slug: true }
    });
    if (!competition) return errorResponse(res, 'Competition not found', 404);

    let result;
    if (type === 'new') {
        result = await sendCompetitionUpdateEmails({ newCompetitions: [competition] });
    } else if (type === 'ending') {
        result = await sendCompetitionUpdateEmails({ endingCompetitions: [competition] });
    } else {
        result = await sendCompetitionEndedEmails({ competition });
    }

    // Mark the flag so the hourly cron won't duplicate this competition later.
    if (result.sent > 0 && type === 'new') {
        await prisma.competition.update({ where: { id: competition.id }, data: { newEmailSent: 1 } });
    } else if (result.sent > 0 && type === 'ending') {
        await prisma.competition.update({ where: { id: competition.id }, data: { endingEmailSent: 1 } });
    }

    // Audit trail (no unique key → always logged).
    await createAdminNotification({
        type: 'marketing_email_resent',
        title: 'Marketing Email Resent',
        message: `${req.user?.email || 'Admin'} sent the "${type}" email for "${competition.title}" to ${result.sent} recipient(s)${result.failed ? ` (${result.failed} failed)` : ''}.`,
        meta: { competitionId: competition.id, type, by: req.user?.id, ...result }
    });

    return successResponse(
        res,
        `Email sent to ${result.sent} recipient(s)${result.failed ? `, ${result.failed} failed` : ''}.`,
        200,
        result
    );
});
