const { addCompetition, getAllCompetitions, updateCompetition, competitionDetail, createCompetitionPayment, deleteCompetition } = require("../controller/competitionController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");

const router = require("express").Router();

router.post("/competition/create",
  verifyToken,
  upload.fields([
    // { name: "detailImage", maxCount: 1 },
    { name: "prizeDetailImage", maxCount: 1 },
    // { name: "rulesImage", maxCount: 1 },
    { name: "images", maxCount: 10 }, // ✅ include here
    { name: "instantWinImages", maxCount: 50 },
    { name: "prizeImages", maxCount: 10 }
  ]), addCompetition);

router.get("/competition/get",
  // verifyToken, 
  getAllCompetitions);

router.get("/competition/:id",
  // verifyToken,
  competitionDetail
)
router.post("/competition/update/:id",
  verifyToken,
  upload.fields([
    // { name: "detailImage", maxCount: 1 },
    { name: "prizeDetailImage", maxCount: 1 },
    // { name: "rulesImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "instantWinImages", maxCount: 50 },
    { name: "prizeImages", maxCount: 10 }
  ]), updateCompetition);

router.post("/competition/ticket-buy", verifyToken, createCompetitionPayment);
router.delete("/competition/:id", verifyToken, deleteCompetition);

module.exports = router;