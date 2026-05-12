const { purchaseGiftCredit } = require("../controller/giftCreditController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/gift/credit/purchase", verifyToken, purchaseGiftCredit);

module.exports = router;