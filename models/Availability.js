// models/disponibility.js
const mongoose = require("mongoose");

const disponibilitySchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  slots: [{
    day: { 
      type: String, 
      enum: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
      required: true
    },
    start: { type: String, required: true }, // Format "HH:MM"
    end: { type: String, required: true },   // Format "HH:MM"
    _id: false
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Disponibility', disponibilitySchema);
