const { addEnquiry } = require("../controller/contactController");

const router = require("express").Router();

router.post("/enquiry", addEnquiry);

module.exports = router;