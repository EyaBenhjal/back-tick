const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true },
    password: { type: String, required: true },
    profileImage: { type: String, required: true },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false
  },
    verified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetToken: { type: String }, 
    resetTokenExpires: { type: Date }, 
    role: {
      type: String,
      enum: ['Client', 'Agent', 'Admin'], // Valeurs autorisées
      required: true,
      default: 'Client' // Valeur par défaut
    },
  

    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
    skills: [{ type: String, trim: true }],
    socialMedia: {
      linkedin: { type: String, trim: true },
      twitter: { type: String, trim: true }
    },
    joiningTime: { type: Date, default: Date.now }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
module.exports = User; 