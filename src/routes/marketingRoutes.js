const { resendCompetitionEmail } = require("../controller/marketingController");
const { verifyToken, requireAdmin } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/admin/marketing/competition-email", verifyToken, requireAdmin, resendCompetitionEmail);

module.exports = router;
