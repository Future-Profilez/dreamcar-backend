const { verifyPayment, getPaymentHistory } = require("../controller/paymentController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.get("/payment/verify", verifyToken, verifyPayment);
router.get("/payment/history", verifyToken, getPaymentHistory);


module.exports = router;