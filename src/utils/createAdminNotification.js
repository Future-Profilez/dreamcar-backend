const prisma = require("../prismaconfig");

async function createAdminNotification({ key = null, type, title, message, meta = null }) {
  try {
    if (key) {
      const existing = await prisma.adminNotification.findUnique({ where: { key } });
      if (existing) return false;
    }
    await prisma.adminNotification.create({
      data: {
        key,
        type,
        title,
        message,
        meta
      }
    });
    return true;
  } catch (err) {
    if (err && err.code === "P2002") {
      return false;
    }
    throw err;
  }
}

module.exports = { createAdminNotification };
