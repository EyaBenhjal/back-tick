const User = require("../models/User");
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -verificationToken -resetToken")
      .populate('department', 'dep_name');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "Utilisateur non trouvé" 
      });
    }

    // Construction dynamique de l'URL
    const getFullUrl = (path) => path 
      ? `${req.protocol}://${req.get('host')}${path}`
      : `${req.protocol}://${req.get('host')}/uploads/default-profile.png`;

    res.status(200).json({ 
      success: true, 
      user: {
        ...user.toObject(),
        profileImage: getFullUrl(user.profileImage),
        bio: user.bio || "",
        socialLinks: user.socialMedia || {
          linkedin: "",
          twitter: ""
        },
        skills: user.skills || []
      }
    });
  } catch (err) {
    console.error("Erreur getProfile:", err);
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur" 
    });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user.id;

    // Champs protégés
    const protectedFields = ['role', 'verified', 'verificationToken', 'createdAt', 'updatedAt'];
    protectedFields.forEach(field => delete updates[field]);

    // Gestion du mot de passe
    if (updates.newPassword) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: "Utilisateur non trouvé" 
        });
      }

      if (!await bcrypt.compare(updates.currentPassword, user.password)) {
        return res.status(400).json({ 
          success: false, 
          error: "Mot de passe actuel incorrect" 
        });
      }
      
      updates.password = await bcrypt.hash(updates.newPassword, 10);
      delete updates.newPassword;
      delete updates.currentPassword;
    }

    // Gestion de l'image de profil
    if (req.file) {
      const currentUser = await User.findById(userId);
      if (currentUser.profileImage && !currentUser.profileImage.includes('default-profile.png')) {
        const oldImagePath = path.join(__dirname, '../public', currentUser.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updates.profileImage = '/uploads/' + req.file.filename;
    }

    if (updates.skills) {
      if (typeof updates.skills === 'string') {
        updates.skills = updates.skills.split(',').map(skill => skill.trim());
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      updates, 
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ 

      success: true, 
      user: {
        ...updatedUser.toObject(),
        profileImage: updatedUser.profileImage 
          ? `${req.protocol}://${req.get('host')}${updatedUser.profileImage}`
          : `${req.protocol}://${req.get('host')}/uploads/default-profile.png`,
        bio: updatedUser.bio || "",
        socialLinks: updatedUser.socialMedia || {
          linkedin: "",
          twitter: ""
        },
        skills: updatedUser.skills || []
      }
    });
  } catch (err) {
    console.error("Erreur updateProfile:", err);
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};