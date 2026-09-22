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

    // Defence-in-depth: Reconcile any competition whose reservedTickets might have drifted
    const activeComps = await prisma.competition.findMany({
      where: {
        OR: [
          { reservedTickets: { gt: 0 } },
          { reservedTickets: { lt: 0 } }
        ]
      },
      select: { id: true }
    });

    for (const comp of activeComps) {
      await prisma.$executeRaw`
        UPDATE "Competition"
        SET "reservedTickets" = (
          SELECT COALESCE(SUM(quantity), 0)
          FROM "TicketReservation"
          WHERE "competitionId" = ${comp.id}
            AND status = 'reserved'
            AND "expiresAt" > NOW()
        )
        WHERE id = ${comp.id}`;
    }

    Loggers.info(`Cron: released expired reservations for ${stale.length} session(s)`);
  } catch (error) {
    Loggers.error(`Cron Error (ReleaseExpiredReservations): ${error.message}`);
  }
}

// Every 5 minutes
cron.schedule('*/5 * * * *', releaseExpiredReservations);

module.exports = { releaseExpiredReservations };
