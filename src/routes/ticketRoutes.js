const { getTickets } = require("../controller/ticketController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.get("/tickets", verifyToken, getTickets);

module.exports = router;