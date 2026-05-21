const { addEnquiry, listEnquiries, deleteEnquiry } = require("../controller/contactController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.post("/enquiry", addEnquiry);
router.get("/get-enquiries",verifyToken,listEnquiries);
router.delete("/enquiry/:id", verifyToken, deleteEnquiry);

module.exports = router;