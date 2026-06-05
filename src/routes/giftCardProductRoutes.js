const router = require("express").Router();
const upload = require("../utils/uploader");
const { verifyToken, requireAdmin } = require("../utils/tokenVerify");

const {
  listGiftCardProducts,
  getGiftCardProduct,
  adminListGiftCardProducts,
  createGiftCardProduct,
  updateGiftCardProduct,
  deleteGiftCardProduct,
} = require("../controller/giftCardProductController");

router.get("/gift-card-products", listGiftCardProducts);
router.get("/gift-card-products/:id", getGiftCardProduct);

router.get("/admin/gift-card-products", verifyToken, requireAdmin, adminListGiftCardProducts);
router.post(
  "/admin/gift-card-products",
  verifyToken,
  requireAdmin,
  upload.single("image"),
  createGiftCardProduct
);
router.post(
  "/admin/gift-card-products/:id",
  verifyToken,
  requireAdmin,
  upload.single("image"),
  updateGiftCardProduct
);
router.delete("/admin/gift-card-products/:id", verifyToken, requireAdmin, deleteGiftCardProduct);

module.exports = router;

