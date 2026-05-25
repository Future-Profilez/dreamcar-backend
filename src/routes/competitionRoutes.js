const { addCompetition, getAllCompetitions, updateCompetition, competitionDetail, createCompetitionPayment, deleteCompetition, getCurrencyRates, syncCurrencyRates, getDashboardData, toggleFeaturedCompetition, getSimilarCompetitions, getAllInstantWinsAdmin, triggerCompetitionUpdates } = require("../controller/competitionController");
const { verifyToken, checkIsAdminHasCapablity, requireAdmin } = require("../utils/tokenVerify");
const upload = require("../utils/uploader");

const router = require("express").Router();

router.get("/currency-rates", getCurrencyRates);
router.post("/admin/sync-currency", verifyToken, requireAdmin, syncCurrencyRates);
router.post("/admin/trigger-competition-updates", verifyToken, requireAdmin, triggerCompetitionUpdates);

router.post("/competition/create",
  verifyToken,
  requireAdmin,
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

router.get("/admin/instant-wins", verifyToken, requireAdmin, getAllInstantWinsAdmin);

router.get("/competition/:id",
  // verifyToken,
  competitionDetail
)
router.post("/competition/update/:id",
  verifyToken,
  requireAdmin,
  upload.fields([
    // { name: "detailImage", maxCount: 1 },
    { name: "prizeDetailImage", maxCount: 1 },
    // { name: "rulesImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "instantWinImages", maxCount: 50 },
    { name: "prizeImages", maxCount: 10 }
  ]), updateCompetition);

router.post("/competition/ticket-buy", verifyToken, checkIsAdminHasCapablity, createCompetitionPayment);
router.delete("/competition/:id", verifyToken, requireAdmin, deleteCompetition);

//admin dashboard
router.get("/admin/dashboard", verifyToken, requireAdmin, getDashboardData);

//featured competition
router.post( "/competition/feature/:id", verifyToken, requireAdmin, toggleFeaturedCompetition);

//similar competitions
router.get("/competition/similar/:id", getSimilarCompetitions);

module.exports = router;
