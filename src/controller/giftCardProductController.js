const prisma = require("../prismaconfig");
const catchAsync = require("../utils/catchAsync");
const { successResponse, errorResponse } = require("../utils/ErrorHandling");

const getBaseUrl = (req) =>
  (process.env.BACKEND_PUBLIC_URL ||
    process.env.DOMAIN ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");

const ensureGiftCardProductModel = (res) => {
  if (!prisma || !prisma.giftCardProduct) {
    return errorResponse(
      res,
      "Server Prisma client is outdated. Run `npx prisma generate` and restart backend.",
      500
    );
  }
  return null;
};

exports.listGiftCardProducts = catchAsync(async (req, res) => {
  try {
    const guard = ensureGiftCardProductModel(res);
    if (guard) return;
    const items = await prisma.giftCardProduct.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(res, "Gift card products fetched", 200, items);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.getGiftCardProduct = catchAsync(async (req, res) => {
  try {
    const guard = ensureGiftCardProductModel(res);
    if (guard) return;
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return errorResponse(res, "Invalid product id", 200);
    }

    const item = await prisma.giftCardProduct.findFirst({
      where: { id, isActive: true },
    });

    if (!item) {
      return errorResponse(res, "Gift card product not found", 200);
    }

    return successResponse(res, "Gift card product fetched", 200, item);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.adminListGiftCardProducts = catchAsync(async (req, res) => {
  try {
    const guard = ensureGiftCardProductModel(res);
    if (guard) return;
    const { isActive } = req.query;
    const where = {};
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const items = await prisma.giftCardProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, "Gift card products fetched", 200, items);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.createGiftCardProduct = catchAsync(async (req, res) => {
  try {
    const guard = ensureGiftCardProductModel(res);
    if (guard) return;
    const { title, description, price, isActive } = req.body;

    if (!title || !String(title).trim()) {
      return errorResponse(res, "Title is required", 200);
    }

    const parsedPrice = parseInt(price);
    if (!parsedPrice || parsedPrice <= 0) {
      return errorResponse(res, "Invalid price", 200);
    }

    const file = req.file;
    if (!file) {
      return errorResponse(res, "Image is required", 200);
    }

    const baseUrl = getBaseUrl(req);
    const image = `${baseUrl}/uploads/${file.filename}`;

    const item = await prisma.giftCardProduct.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        price: parsedPrice,
        image,
        isActive:
          typeof isActive === "undefined"
            ? true
            : String(isActive) === "true",
      },
    });

    return successResponse(res, "Gift card product created", 200, item);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.updateGiftCardProduct = catchAsync(async (req, res) => {
  try {
    const guard = ensureGiftCardProductModel(res);
    if (guard) return;
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return errorResponse(res, "Invalid product id", 200);
    }

    const existing = await prisma.giftCardProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse(res, "Gift card product not found", 200);
    }

    const { title, description, price, isActive } = req.body;
    const data = {};

    if (typeof title !== "undefined") {
      if (!String(title).trim()) {
        return errorResponse(res, "Invalid title", 200);
      }
      data.title = String(title).trim();
    }

    if (typeof description !== "undefined") {
      data.description = description ? String(description).trim() : null;
    }

    if (typeof price !== "undefined") {
      const parsedPrice = parseInt(price);
      if (!parsedPrice || parsedPrice <= 0) {
        return errorResponse(res, "Invalid price", 200);
      }
      data.price = parsedPrice;
    }

    if (typeof isActive !== "undefined") {
      data.isActive = String(isActive) === "true";
    }

    if (req.file) {
      const baseUrl = getBaseUrl(req);
      data.image = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const item = await prisma.giftCardProduct.update({
      where: { id },
      data,
    });

    return successResponse(res, "Gift card product updated", 200, item);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});

exports.deleteGiftCardProduct = catchAsync(async (req, res) => {
  try {
    const guard = ensureGiftCardProductModel(res);
    if (guard) return;
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return errorResponse(res, "Invalid product id", 200);
    }

    const existing = await prisma.giftCardProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse(res, "Gift card product not found", 200);
    }

    const item = await prisma.giftCardProduct.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(res, "Gift card product deleted", 200, item);
  } catch (error) {
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});
