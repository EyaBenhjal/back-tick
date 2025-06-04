// routes/availabilityRoutes.js
const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../middlewares/authMiddleware");
const {
    createOrUpdateAvailability,
    getUserAvailability,
    addAvailabilitySlot,
    removeAvailabilitySlot
} = require("../controllers/availabilityController");

router.put("/:slotId", verifyAccessToken, createOrUpdateAvailability);

router.get("/listdis", verifyAccessToken, getUserAvailability);

router.post("/slots", verifyAccessToken, addAvailabilitySlot);

router.delete("/slots/:slotId", verifyAccessToken, removeAvailabilitySlot);

module.exports = router;