const { drawWinner, getUserWins, getPublicWinners } = require("../controller/winnerController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/draw/winner", drawWinner);
router.get("/mywins", verifyToken, getUserWins);
router.get("/public/winners", getPublicWinners);

module.exports = router;