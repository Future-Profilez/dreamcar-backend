const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");
const { successResponse, errorResponse } = require("../utils/ErrorHandling");

exports.getAdminNotifications = catchAsync(async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return errorResponse(res, "Unauthorized", 403);
    }

    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "30"), 1), 100);
    const skip = (page - 1) * limit;

    const [items, totalItems, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.adminNotification.count(),
      prisma.adminNotification.count({ where: { isRead: false } })
    ]);

    return successResponse(res, "Notifications fetched", 200, {
      notifications: items,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit
      },
      unreadCount
    });
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.markAllAdminNotificationsRead = catchAsync(async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return errorResponse(res, "Unauthorized", 403);
    }

    await prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });

    return successResponse(res, "All notifications marked as read", 200);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.markAdminNotificationRead = catchAsync(async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return errorResponse(res, "Unauthorized", 403);
    }

    const { id } = req.params;
    if (!id) {
      return errorResponse(res, "Notification id is required", 400);
    }

    const updated = await prisma.adminNotification.update({
      where: { id },
      data: { isRead: true }
    });

    return successResponse(res, "Notification marked as read", 200, updated);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.deleteAdminNotification = catchAsync(async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return errorResponse(res, "Unauthorized", 403);
    }

    const { id } = req.params;
    if (!id) {
      return errorResponse(res, "Notification id is required", 400);
    }

    await prisma.adminNotification.delete({ where: { id } });
    return successResponse(res, "Notification deleted", 200);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.deleteAllAdminNotifications = catchAsync(async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return errorResponse(res, "Unauthorized", 403);
    }

    await prisma.adminNotification.deleteMany({});
    return successResponse(res, "All notifications deleted", 200);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

