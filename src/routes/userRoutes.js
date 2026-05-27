const { signup, login, GetUser, updateProfile, getUserProfileDashboard, getAllUsers, createWalletPayment, getWallet, deleteAccount, verifyOTP, resendOTP, forgotPassword, resetPassword, toggleBlockUser, deleteUserByAdmin, resetAdminPassword } = require("../controller/userController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/user/register", signup);
router.post("/user/verify-otp", verifyOTP);
router.post("/user/resend-otp", resendOTP);
router.post("/user/login", login);
router.post("/user/forgot-password", forgotPassword);
router.post("/user/reset-password", resetPassword);
router.get("/user/profile", verifyToken, GetUser);
router.put("/user/profile", verifyToken, updateProfile);
router.delete("/user/delete", verifyToken, deleteAccount);
router.post("/admin/user/block/:id", verifyToken, toggleBlockUser);
// router.delete("/admin/user/delete/:id", verifyToken, deleteUserByAdmin);
router.get("/user/profile/dashboard", verifyToken, getUserProfileDashboard);
router.get("/users", verifyToken, getAllUsers);

router.get("/user/wallet/get", verifyToken, getWallet);
router.post("/users/wallet/recharge", verifyToken, createWalletPayment);



// admin routes
router.post("/admin/login", login);
router.post("/admin/reset-password", verifyToken, resetAdminPassword);



module.exports = router;