const { addEnquiry, listEnquiries } = require("../controller/contactController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/enquiry", addEnquiry);
router.get("/get-enquiries",verifyToken,listEnquiries);

module.exports = router;