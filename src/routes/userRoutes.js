const { signup, login } = require("../controller/userController");

const router = require("express").Router();

router.post("/user/register", signup);
router.post("/user/login", login);

module.exports = router;