
const { addToCart, getCart } = require("../controller/cartController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/cart/add", verifyToken, addToCart);
router.get('/cart',verifyToken, getCart);



module.exports = router;