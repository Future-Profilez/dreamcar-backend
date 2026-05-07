const { drawWinner, getUserWins, getPublicWinners, getUserInstantWins } = require("../controller/winnerController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/draw/winner", drawWinner);
router.get("/mywins", verifyToken, getUserWins);
router.get("/myinstantwins", verifyToken, getUserInstantWins);
router.get("/public/winners", getPublicWinners);

module.exports = router;