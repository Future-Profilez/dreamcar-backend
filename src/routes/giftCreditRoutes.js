const { purchaseGiftCredit, redeemGiftCredit } = require("../controller/giftCreditController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/gift/credit/purchase", verifyToken, purchaseGiftCredit);

router.post( "/gift/credit/redeem", verifyToken, redeemGiftCredit);

module.exports = router;