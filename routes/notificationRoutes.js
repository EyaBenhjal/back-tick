const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyAccessToken } = require("../middlewares/authMiddleware");
const { checkNotificationOwnership } = require("../middlewares/notificationMiddleware");

// Utilisez notificationController.createNotification directement
router.post('/cre', verifyAccessToken, notificationController.createNotification);

// Vérifiez que ces méthodes existent bien dans le contrôleur
router.get('/:id', verifyAccessToken, notificationController.getUserNotifications);
router.patch('/:id/read', verifyAccessToken, checkNotificationOwnership, notificationController.markAsRead);

module.exports = router;