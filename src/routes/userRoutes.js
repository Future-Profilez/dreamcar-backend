const { signup, login, GetUser } = require("../controller/userController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/user/register", signup);
router.post("/user/login", login);
router.get("/user/profile", verifyToken, GetUser);

// admin routes
router.post("/admin/login", login({ adminOnly: true }));


module.exports = router;