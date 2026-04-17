const { addCompetition, getAllCompetitions, competitionDetail } = require("../controller/competitionController");
const { verifyToken } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");

const router = require("express").Router();

router.post("/competition/create", 
    // verifyToken,
  upload.fields([
    // { name: "detailImage", maxCount: 1 },
    { name: "prizeDetailImage", maxCount: 1 },
    // { name: "rulesImage", maxCount: 1 },
    { name: "images", maxCount: 10 }, // ✅ include here
  ]), addCompetition);

router.get("/competition/get", 
  // verifyToken, 
  getAllCompetitions);

router.get("/competition/:id",
  // verifyToken,
  competitionDetail
)

module.exports = router;