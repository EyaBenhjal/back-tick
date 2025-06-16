// models/ChatMessage.js
const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  from: {
    type: String,
    enum: ['user', 'bot'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Si tu veux lier à un utilisateur ou ticket (optionnel)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
