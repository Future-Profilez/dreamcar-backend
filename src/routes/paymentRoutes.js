const { verifyPayment } = require("../controller/paymentController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.get("/payment/verify", verifyToken, verifyPayment);


module.exports = router;