const { addCompetition, getAllCompetitions, updateCompetition } = require("../controller/competitionController");
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

router.post("/competition/update/:id",
  verifyToken,
  upload.fields([
    { name: "detailImage", maxCount: 1 },
    { name: "prizeDetailImage", maxCount: 1 },
    { name: "rulesImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]), updateCompetition);

router.get("/competition/get", verifyToken, getAllCompetitions);

module.exports = router;