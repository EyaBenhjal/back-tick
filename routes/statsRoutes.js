const express = require("express");
const { getTicketStats } = require("../controllers/statsController");
const { verifyAccessToken } = require("../middlewares/authMiddleware");

const router = express.Router();
router.get("/stats", verifyAccessToken, getTicketStats);
module.exports = router;