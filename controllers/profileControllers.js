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

    const getFullUrl = (imgPath) =>
      imgPath
        ? `${req.protocol}://${req.get('host')}${imgPath}`
        : `${req.protocol}://${req.get('host')}/uploads/default-profile.png`;

    res.status(200).json({ 
      success: true, 
      user: {
        ...user.toObject(),
        profileImage: getFullUrl(user.profileImage),
        bio: user.bio || "",
        socialLinks: user.socialMedia || { linkedin: "", twitter: "" },
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

    // Nettoyage des données
    delete updates.role;
    delete updates.verified;

    // Gestion de l'image
    if (req.file) {
      updates.profileImage = '/uploads/' + req.file.filename;
    }

    // Formatage des réseaux sociaux
    if (updates.linkedin || updates.twitter) {
      updates.socialMedia = {
        linkedin: updates.linkedin || "",
        twitter: updates.twitter || ""
      };
      delete updates.linkedin;
      delete updates.twitter;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true
    }).select("-password -verificationToken");

    res.json({
      success: true,
      user: {
        ...updatedUser.toObject(),
        profileImage: updatedUser.profileImage 
          ? `${req.protocol}://${req.get('host')}${updatedUser.profileImage}`
          : `${req.protocol}://${req.get('host')}/uploads/default-profile.png`
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};
exports.removeSkill = async (req, res) => {
  try {
    const { skillToRemove } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    // Filtrer les compétences
    user.skills = user.skills.filter(skill => skill !== skillToRemove);

    await user.save();

    res.json({
      success: true,
      message: "Compétence supprimée avec succès",
      skills: user.skills
    });
  } catch (err) {
    console.error("Erreur removeSkill:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

exports.addSkill = async (req, res) => {
  try {
    const { skill } = req.body;
    const userId = req.user.id;

    if (!skill || skill.trim() === "") {
      return res.status(400).json({ success: false, error: "Compétence invalide" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
    }

    if (user.skills.includes(skill)) {
      return res.status(400).json({ success: false, error: "Compétence déjà ajoutée" });
    }

    if (user.skills.length >= 10) {
      return res.status(400).json({ success: false, error: "Maximum de 10 compétences atteint" });
    }

    user.skills.push(skill);
    await user.save();

    res.json({
      success: true,
      message: "Compétence ajoutée avec succès",
      skills: user.skills
    });
  } catch (err) {
    console.error("Erreur addSkill:", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};
