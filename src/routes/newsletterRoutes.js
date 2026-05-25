const {subscribeNewsletter,getNewsletterSubscribers, deleteNewsletterSubscriber} = require("../controller/newsletterController");
const { verifyToken, requireAdmin } = require("../utils/tokenVerify");
const router = require("express").Router();

router.post("/newsletter/subscribe",subscribeNewsletter);

router.get("/newsletter/subscribers", verifyToken, requireAdmin, getNewsletterSubscribers);
router.delete("/newsletter/subscriber/:id", verifyToken, requireAdmin, deleteNewsletterSubscriber);

module.exports = router;
