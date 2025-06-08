const mongoose = require("mongoose");

const disponibilitySchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  status: {
    type: String,
    enum: ['Disponible', 'Occupé', 'Absent', 'Hors ligne'],
    default: 'Disponible'
  },
  currentTickets: {
    type: Number,
    default: 0
  },
  maxTickets: {
    type: Number,
    default: 10
  },
  slots: [{
    day: { 
      type: String, 
      enum: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
      required: true
    },
    start: { type: String, required: true },
    end: { type: String, required: true },
    _id: false
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Disponibility', disponibilitySchema);
