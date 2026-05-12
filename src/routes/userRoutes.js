const { signup, login, GetUser, getUserProfileDashboard, getAllUsers, createWalletPayment, getWallet } = require("../controller/userController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/user/register", signup);
router.post("/user/login", login);
router.get("/user/profile", verifyToken, GetUser);
router.get("/user/profile/dashboard", verifyToken, getUserProfileDashboard);
router.get("/users", verifyToken, getWallet);

router.get("/users/wallet/get", verifyToken, createWalletPayment);
router.post("/users/wallet/recharge", verifyToken, createWalletPayment);



// admin routes
router.post("/admin/login", login);



module.exports = router;