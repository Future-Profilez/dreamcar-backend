const cron = require('node-cron');
const prisma = require('../prismaconfig');
const Loggers = require('../utils/Logger');
const { releaseReservationsForSession } = require('../utils/paymentProcessor');

// Safety net for the reservation system: if a Stripe `checkout.session.expired`
// webhook is ever missed, stale "reserved" rows would otherwise hold inventory
// forever. This sweeps reservations past their expiry and releases them.
// (The webhook is the primary path; this is defence-in-depth.)
async function releaseExpiredReservations() {
  try {
    const stale = await prisma.ticketReservation.findMany({
      where: { status: 'reserved', expiresAt: { lt: new Date() } },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });

    if (stale.length === 0) return;

    for (const { sessionId } of stale) {
      // Idempotent + atomic per reservation row (only "reserved" rows are claimed),
      // so this never double-decrements or races a concurrent confirm.
      await releaseReservationsForSession(sessionId);
    }

    Loggers.info(`Cron: released expired reservations for ${stale.length} session(s)`);
  } catch (error) {
    Loggers.error(`Cron Error (ReleaseExpiredReservations): ${error.message}`);
  }
}

// Every 5 minutes
cron.schedule('*/5 * * * *', releaseExpiredReservations);

module.exports = { releaseExpiredReservations };
