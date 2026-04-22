const { errorResponse, successResponse, validationErrorResponse, } = require("../utils/ErrorHandling");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../prismaconfig");


exports.addToCart = catchAsync(async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemId, quantity, itemType } = req.body;

        if (!itemId || !quantity) {
            return errorResponse(res, "Missing required fields", 200);
        }
        if (quantity <= 0) {
            return errorResponse(res, "Invalid quantity", 200);
        }
        let cart = await prisma.cart.findUnique({
            where: { userId },
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId },
            });
        }

        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                itemId: parseInt(itemId),
                itemType: itemType || "competition",
            },
        });

        let cartItem;

        if (existingItem) {
            cartItem = await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: existingItem.quantity + parseInt(quantity),
                },
            });
        } else {
            cartItem = await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    itemId: parseInt(itemId),
                    quantity: parseInt(quantity),
                    itemType: itemType || "competition",
                },
            });
        }
        return successResponse(res, "Item added to cart", 200, cartItem);
    } catch (error) {
        console.log("Add To Cart Error:", error);
        return errorResponse(res, error.message || "Internal Server Error", 500);
    }
});

exports.getCart = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!cart) {
      return successResponse(res, "Cart is empty", 200, []);
    }

    const cartItems = await Promise.all(
      cart.items.map(async (item) => {
        let details = null;

        // 👉 based on item type
        if (item.itemType === "competition") {
          details = await prisma.competition.findUnique({
            where: { id: item.itemId },
          });
        }

        // future ready
        if (item.itemType === "gift_card") {
          details = await prisma.giftCard?.findUnique({
            where: { id: item.itemId },
          });
        }

        if (item.itemType === "gift_credit") {
          details = await prisma.giftCredit?.findUnique({
            where: { id: item.itemId },
          });
        }

        return {
          ...item,
          details,
        };
      })
    );

    return successResponse(res, "Cart fetched successfully", 200, cartItems);
  } catch (error) {
    console.log("Get Cart Error:", error);
    return errorResponse(res, error.message || "Internal Server Error", 500);
  }
});