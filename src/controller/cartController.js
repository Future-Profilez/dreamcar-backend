const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");

const RESERVATION_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Helper to synchronize Competition.reservedTickets to the actual active reservations count
const reconcileCompetitionReserved = async (competitionId, tx = prisma) => {
  await tx.$executeRaw`
    UPDATE "Competition"
    SET "reservedTickets" = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM "TicketReservation"
      WHERE "competitionId" = ${competitionId}
        AND status = 'reserved'
        AND "expiresAt" > NOW()
    )
    WHERE id = ${competitionId}`;
};

// Helper to clean up any expired reservations globally in DB
const cleanupExpiredReservations = async () => {
  try {
    const now = new Date();
    const expiredList = await prisma.ticketReservation.findMany({
      where: {
        status: "reserved",
        expiresAt: { lt: now }
      },
      select: { id: true, competitionId: true }
    });

    if (expiredList.length === 0) return;

    const compIds = [...new Set(expiredList.map(r => r.competitionId))];

    await prisma.ticketReservation.updateMany({
      where: {
        id: { in: expiredList.map(r => r.id) }
      },
      data: { status: "expired" }
    });

    for (const compId of compIds) {
      await reconcileCompetitionReserved(compId);
    }
  } catch (err) {
    console.error("Cleanup expired reservations error:", err);
  }
};

// Dynamic helper to calculate unexpired active reserved ticket count for a competition
const getActiveReservedTickets = async (competitionId, excludeUserId = null) => {
  await cleanupExpiredReservations();
  const now = new Date();
  const where = {
    competitionId,
    status: "reserved",
    expiresAt: { gt: now }
  };
  if (excludeUserId) {
    where.userId = { not: excludeUserId };
  }
  const result = await prisma.ticketReservation.aggregate({
    where,
    _sum: { quantity: true }
  });
  return result._sum.quantity || 0;
};

// Helper to synchronize user's cart items with active TicketReservation records
const syncCartReservations = async (userId) => {
  await cleanupExpiredReservations();

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true }
  });

  if (!cart || cart.items.length === 0) {
    // Release any existing reserved items for this user
    const existing = await prisma.ticketReservation.findMany({
      where: { userId, status: "reserved" },
      select: { id: true, competitionId: true }
    });

    if (existing.length > 0) {
      const compIds = [...new Set(existing.map(r => r.competitionId))];
      await prisma.ticketReservation.updateMany({
        where: { id: { in: existing.map(r => r.id) } },
        data: { status: "cancelled" }
      });
      for (const compId of compIds) {
        await reconcileCompetitionReserved(compId);
      }
    }
    return null;
  }

  const now = new Date();
  const compItems = cart.items.filter(i => i.itemType === "competition");
  
  if (compItems.length === 0) {
    return null;
  }

  // Find if user already has an active UNEXPIRED reservation
  const activeReservations = await prisma.ticketReservation.findMany({
    where: {
      userId,
      status: "reserved",
      expiresAt: { gte: now }
    }
  });

  let expiresAt = null;
  let hasValidActiveReservation = activeReservations.length > 0;

  if (hasValidActiveReservation) {
    // Keep existing expiration timestamp
    expiresAt = activeReservations[0].expiresAt;
  } else {
    // Check if tickets are actually available before creating a new 10-min reservation
    let canReserveAll = true;
    for (const item of compItems) {
      const competition = await prisma.competition.findUnique({
        where: { id: item.itemId },
        select: { totalTickets: true, soldTickets: true }
      });
      if (competition) {
        const activeReservedOthers = await getActiveReservedTickets(item.itemId, userId);
        const available = competition.totalTickets - competition.soldTickets - activeReservedOthers;
        if (available < item.quantity) {
          canReserveAll = false;
          break;
        }
      }
    }

    if (canReserveAll) {
      expiresAt = new Date(now.getTime() + RESERVATION_DURATION_MS);
    }
  }

  // If tickets are no longer available to reserve, do not set new timer
  if (!expiresAt && !hasValidActiveReservation) {
    return null;
  }

  // Update or create reservation per competition item
  for (const item of compItems) {
    const existingResv = activeReservations.find(r => r.competitionId === item.itemId);

    if (existingResv) {
      if (item.quantity !== existingResv.quantity) {
        await prisma.ticketReservation.update({
          where: { id: existingResv.id },
          data: {
            quantity: item.quantity,
            expiresAt
          }
        });
      } else {
        await prisma.ticketReservation.update({
          where: { id: existingResv.id },
          data: { expiresAt }
        });
      }
    } else if (expiresAt) {
      const sessionId = `cart_${userId}_${Date.now()}`;
      await prisma.ticketReservation.upsert({
        where: {
          sessionId_competitionId: {
            sessionId,
            competitionId: item.itemId
          }
        },
        update: {
          quantity: item.quantity,
          status: "reserved",
          expiresAt
        },
        create: {
          sessionId,
          competitionId: item.itemId,
          userId,
          quantity: item.quantity,
          status: "reserved",
          expiresAt
        }
      });
    }
    await reconcileCompetitionReserved(item.itemId);
  }

  return expiresAt;
};

exports.reconcileCompetitionReserved = reconcileCompetitionReserved;
exports.getActiveReservedTickets = getActiveReservedTickets;


exports.addToCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, quantity, itemType, answer } = req.body;

    const parsedItemId = parseInt(itemId, 10);
    const parsedQty = parseInt(quantity, 10);

    if (isNaN(parsedItemId) || isNaN(parsedQty) || parsedQty <= 0) {
      return errorResponse(res, "Missing or invalid required fields", 200);
    }

    await cleanupExpiredReservations();

    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        itemId: parsedItemId,
        itemType: itemType || "competition",
      },
    });

    if (itemType === "competition" || !itemType) {
      const competition = await prisma.competition.findUnique({
        where: { id: parsedItemId },
        select: { totalTickets: true, soldTickets: true, reservedTickets: true, status: true, startTime: true }
      });
      if (competition) {
        const now = new Date();
        if (competition.status === 0) {
          return errorResponse(res, "This competition is currently unavailable.", 200);
        }
        if (competition.status === 2 || new Date(competition.startTime) > now) {
          return errorResponse(res, "Ticket sales for this competition have not launched yet!", 200);
        }
        // Calculate available tickets (excluding user's own existing reservation for this item)
        const activeReservedOthers = await getActiveReservedTickets(parsedItemId, userId);
        const available = competition.totalTickets - competition.soldTickets - activeReservedOthers;

        if (parsedQty > available) {
          const totalUnsold = competition.totalTickets - competition.soldTickets;
          if (activeReservedOthers > 0 && totalUnsold >= parsedQty) {
            return errorResponse(res, "High Demand! Someone is currently holding these tickets. Check back shortly!", 200);
          }
          return errorResponse(res, `Only ${Math.max(0, available)} tickets remaining`, 200);
        }
      }
    }

    let cartItem;

    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: parsedQty,
          answer: answer || existingItem.answer
        },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          itemId: parsedItemId,
          quantity: parsedQty,
          itemType: itemType || "competition",
          answer: answer || null
        },
      });
    }

    const expiresAt = await syncCartReservations(userId);

    return successResponse(res, "Item added to cart", 200, {
      cartItem,
      expiresAt
    });
  } catch (error) {
    return errorResponse(res, error.message || "Failed to add item to cart", 200);
  }
});


exports.getCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const expiresAt = await syncCartReservations(userId);

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      return successResponse(res, "Cart is empty", 200, {
        items: [],
        expiresAt: null
      });
    }

    const cartItems = await Promise.all(
      cart.items.map(async (item) => {
        let details = null;
        let availableTickets = null;
        let isAvailable = true;

        if (item.itemType === "competition") {
          details = await prisma.competition.findUnique({
            where: { id: item.itemId },
            include: {
              questions: {
                select: {
                  id: true,
                  question: true,
                  options: true
                }
              }
            }
          });

          if (details) {
            const activeReservedOthers = await getActiveReservedTickets(item.itemId, userId);
            availableTickets = Math.max(0, details.totalTickets - details.soldTickets - activeReservedOthers);
            isAvailable = availableTickets >= item.quantity;
          }
        }

        return {
          ...item,
          details,
          availableTickets,
          isAvailable
        };
      })
    );

    return successResponse(res, "Cart fetched successfully", 200, {
      items: cartItems,
      expiresAt: expiresAt ? expiresAt.toISOString() : null
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});


exports.updateCartItem = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId, quantity } = req.body;

    await cleanupExpiredReservations();

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        itemId: parseInt(itemId),
        cart: {
          userId
        }
      },
    });

    if (!existingItem) {
      return errorResponse(res, "Cart item not found", 200);
    }

    if (quantity < 1) {
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
      const expiresAt = await syncCartReservations(userId);
      return successResponse(res, "Item removed", 200, { expiresAt });
    }

    if (existingItem.itemType === "competition") {
      const competition = await prisma.competition.findUnique({
        where: { id: parseInt(itemId) },
        select: { totalTickets: true, soldTickets: true, reservedTickets: true }
      });
      if (competition) {
        const activeReservedOthers = await getActiveReservedTickets(parseInt(itemId), userId);
        const available = competition.totalTickets - competition.soldTickets - activeReservedOthers;

        if (parseInt(quantity) > available) {
          const totalUnsold = competition.totalTickets - competition.soldTickets;
          if (activeReservedOthers > 0 && totalUnsold >= parseInt(quantity)) {
            return errorResponse(res, "High Demand! Someone is currently holding these tickets. Check back shortly!", 200);
          }
          return errorResponse(res, `Only ${Math.max(0, available)} tickets remaining`, 200);
        }
      }
    }


    const updatedItem = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: parseInt(quantity),
      },
    });

    const expiresAt = await syncCartReservations(userId);

    return successResponse(res, "Cart updated", 200, {
      updatedItem,
      expiresAt
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

exports.reReserveCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    await cleanupExpiredReservations();

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!cart || cart.items.length === 0) {
      return errorResponse(res, "Cart is empty", 200);
    }

    const compItems = cart.items.filter(i => i.itemType === "competition");
    if (compItems.length === 0) {
      return successResponse(res, "No competition items to reserve", 200, { expiresAt: null });
    }

    // Check availability for all items
    for (const item of compItems) {
      const competition = await prisma.competition.findUnique({
        where: { id: item.itemId },
        select: { id: true, title: true, totalTickets: true, soldTickets: true }
      });

      if (!competition) {
        return errorResponse(res, "Competition not found", 200);
      }

      const activeReservedOthers = await getActiveReservedTickets(item.itemId, userId);
      const available = competition.totalTickets - competition.soldTickets - activeReservedOthers;

      if (available < item.quantity) {
        const totalUnsold = competition.totalTickets - competition.soldTickets;
        if (activeReservedOthers > 0 && totalUnsold >= item.quantity) {
          return errorResponse(res, "High Demand! Someone is currently holding these tickets. Check back shortly!", 200);
        }
        return errorResponse(res, `Only ${Math.max(0, available)} tickets remaining for ${competition.title}`, 200);
      }
    }

    // Lock tickets and create fresh 10-minute reservation
    const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MS);

    // Cancel any previous active reservations for this user on these items
    await prisma.ticketReservation.updateMany({
      where: {
        userId,
        competitionId: { in: compItems.map(i => i.itemId) },
        status: "reserved"
      },
      data: { status: "cancelled" }
    });

    for (const item of compItems) {
      const sessionId = `cart_${userId}_${Date.now()}`;
      await prisma.ticketReservation.create({
        data: {
          sessionId,
          competitionId: item.itemId,
          userId,
          quantity: item.quantity,
          status: "reserved",
          expiresAt
        }
      });
      await reconcileCompetitionReserved(item.itemId);
    }

    return successResponse(res, "Tickets re-reserved successfully!", 200, {
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
