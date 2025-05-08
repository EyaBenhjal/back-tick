const express = require('express');
const router = express.Router();
const { 
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  assignAgent,
  closeTicket
} = require('../controllers/ticketControllers');
const { verifyAccessToken } = require('../middlewares/authMiddleware');
const { ticketUpload } = require('../middlewares/upload');

// Routes
router.post('/tickets', verifyAccessToken, ticketUpload, createTicket);
router.get('/', verifyAccessToken, getTickets);
router.get('/:ticketId', verifyAccessToken, getTicketById);
router.put('/:ticketId', verifyAccessToken, ticketUpload, updateTicket);
router.delete('/:ticketId', verifyAccessToken, deleteTicket);
router.put('/:ticketId/assign', verifyAccessToken, assignAgent);
router.put('/:ticketId/close', verifyAccessToken, closeTicket);
module.exports = router;