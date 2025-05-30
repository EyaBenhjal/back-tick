const express = require("express");
const { getTicketStats } = require("../controllers/statsController");
const { verifyAccessToken } = require("../middlewares/authMiddleware");
const { getAgentStats } = require("../controllers/agentStatsController.js");


const router = express.Router();
router.get("/stats", verifyAccessToken, getTicketStats);
router.get("/agent-stats", verifyAccessToken, getAgentStats);

module.exports = router;