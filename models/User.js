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
  googleId: {
    type: String,
    unique: true,
    sparse: true ,
    required: false // Permet plusieurs documents sans ce champ
  },
  profileImage: {
    type: String,
    default: "/uploads/default-profile.png"
  },
  verified: {
    type: Boolean,
    default: false
  },
    verified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetToken: { type: String }, 
    resetTokenExpires: { type: Date }, 
    role: {
      type: String,
      enum: ['Client', 'Agent', 'Admin'], 
      required: true,
      default: 'Client' 
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