const {subscribeNewsletter,getNewsletterSubscribers} = require("../controller/newsletterController");
const { verifyToken } = require("../utils/tokenVerify");
const router = require("express").Router();

router.post("/newsletter/subscribe",subscribeNewsletter);

router.get("/newsletter/subscribers", verifyToken, getNewsletterSubscribers);

module.exports = router;