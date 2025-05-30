const express = require('express');
const router = express.Router();
const { 
  createTicket,
  getTickets, 
  getTicketById,
  updateTicket,
  deleteTicket,
  assignAgent,
  closeTicket,
  addComment,
  updateComment,
  deleteComment,
  downloadFile,
  viewFile,
  updateSatisfaction
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
router.post('/:ticketId/comments', verifyAccessToken, addComment);
router.put('/:ticketId/comments/:commentId', verifyAccessToken, updateComment);
router.delete('/:ticketId/comments/:commentId', verifyAccessToken, deleteComment);
router.get('/:ticketId/files/:fileId/download', verifyAccessToken, downloadFile);
router.get('/:ticketId/files/:fileId/view', verifyAccessToken, viewFile);
router.put('/satisfaction/:ticketId', verifyAccessToken,updateSatisfaction);

module.exports = router;