const { drawWinner, getUserWins, getPublicWinners, getUserInstantWins, resetWinners, addWinnerDetail, getWinnerDetailPrefill, getWinnerDetail, getWinnerHighlights } = require("../controller/winnerController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");

const router = require("express").Router();

router.post("/draw/winner", drawWinner);
router.delete("/draw/winner/:competitionId", resetWinners);
router.get("/mywins", verifyToken, getUserWins);
router.get("/myinstantwins", verifyToken, getUserInstantWins);
router.get("/public/winners", getPublicWinners);
router.post("/winner-detail", verifyToken, upload.fields([
    { name: "winnerImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 10 }
]),
    addWinnerDetail
);
router.get("/winner-detail/prefill", getWinnerDetailPrefill);
router.get("/winner-detail/:competitionId", getWinnerDetail);
router.get("/winner-highlights", getWinnerHighlights);

module.exports = router;