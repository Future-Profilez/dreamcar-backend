const {
  purchaseGiftCredit,
  redeemGiftCredit,
  getAllGiftCredits,
  myGiftCredits
} = require("../controller/giftCreditController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/gift/credit/purchase", verifyToken, purchaseGiftCredit);
router.post("/gift/credit/redeem", verifyToken, redeemGiftCredit);
router.get("/gift/credits/me", verifyToken, myGiftCredits);

router.get("/admin/gift-credits", verifyToken, getAllGiftCredits);

module.exports = router;