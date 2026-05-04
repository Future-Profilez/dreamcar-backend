const { getTickets, getTicketsByCompetition } = require("../controller/ticketController");
const { verifyToken } = require("../utils/tokenVerify");

const router = require("express").Router();

router.get("/tickets", verifyToken, getTickets);
router.get("/tickets/competition/:competitionId", getTicketsByCompetition);

module.exports = router;