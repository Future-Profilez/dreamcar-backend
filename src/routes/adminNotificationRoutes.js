const {
  getAdminNotifications,
  markAllAdminNotificationsRead,
  markAdminNotificationRead,
  deleteAdminNotification,
  deleteAllAdminNotifications
} = require("../controller/adminNotificationController");
const { verifyToken, requireAdmin } = require("../utils/tokenVerify");

const router = require("express").Router();

router.get("/admin/notifications", verifyToken, requireAdmin, getAdminNotifications);
router.patch("/admin/notifications/mark-all-read", verifyToken, requireAdmin, markAllAdminNotificationsRead);
router.patch("/admin/notifications/:id/read", verifyToken, requireAdmin, markAdminNotificationRead);
router.delete("/admin/notifications/delete-all", verifyToken, requireAdmin, deleteAllAdminNotifications);
router.delete("/admin/notifications/:id", verifyToken, requireAdmin, deleteAdminNotification);

module.exports = router;

