const { drawWinner, getUserWins, getPublicWinners, getUserInstantWins, resetWinners } = require("../controller/winnerController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/draw/winner", drawWinner);
router.delete("/draw/winner/:competitionId", resetWinners);
router.get("/mywins", verifyToken, getUserWins);
router.get("/myinstantwins", verifyToken, getUserInstantWins);
router.get("/public/winners", getPublicWinners);

module.exports = router;