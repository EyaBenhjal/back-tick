const express = require('express');
const router = express.Router();
const { 
    createNotification, 
    getUserNotifications, 
    markAsRead,
    createTicketNotification 
  } = require('../controllers/notificationController');const { verifyAccessToken } = require("../middlewares/authMiddleware"); 
const { checkNotificationOwnership } = require("../middlewares/notificationMiddleware");

router.post('/cre',  verifyAccessToken, createNotification);
router.get('/',  verifyAccessToken, getUserNotifications);
router.patch('/:id/read', verifyAccessToken, checkNotificationOwnership, markAsRead);
router.post('/crn',  verifyAccessToken, createTicketNotification);

module.exports = router;