const User = require("../models/User");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate('department', 'dep_name');

    // Ajoutez l'URL complète pour les images
    const usersWithFullPath = users.map(user => ({
      ...user.toObject(),
      profileImage: user.profileImage 
        ? `http://localhost:5000${user.profileImage}`
        : 'http://localhost:5000/uploads/default.jpg'
    }));

    res.status(200).json(usersWithFullPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Configuration de Multer pour stocker dans public/uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Crée le dossier s'il n'existe pas
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Exportez la configuration Multer
exports.upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Mise à jour de l'utilisateur
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    // Si un fichier est uploadé
    if (req.file) {
      updates.profileImage = '/uploads/' + req.file.filename;
    }

    // Gestion du département
    updates.department = updates.department || null;

    // Ne pas mettre à jour le mot de passe s'il est vide
    if (updates.password === '') {
      delete updates.password;
    }

    const user = await User.findByIdAndUpdate(
      id, 
      updates, 
      { new: true }
    ).select("-password").populate('department', 'dep_name');

    if (!user) {
      return res.status(404).json({ success: false, msg: "Utilisateur non trouvé." });
    }

    // Construire l'URL complète de l'image
    const userWithImage = {
      ...user.toObject(),
      profileImage: user.profileImage 
        ? `http://localhost:5000${user.profileImage}`
        : 'http://localhost:5000/uploads/default.jpg'
    };

    res.json({ 
      success: true,
      msg: "Utilisateur mis à jour.", 
      user: userWithImage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Erreur lors de la mise à jour." });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) return res.status(404).json({ msg: "Utilisateur non trouvé." });

    res.json({ msg: "Utilisateur supprimé." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Erreur lors de la suppression." });
  }
};

exports.getUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id)
      .select("-password")
      .populate('department', 'dep_name');

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Ajouter l'URL complète pour l'image
    const userWithFullPath = {
      ...user.toObject(),
      profileImage: user.profileImage 
        ? `http://localhost:5000${user.profileImage}`
        : 'http://localhost:5000/uploads/default.jpg'
    };

    return res.status(200).json({ success: true, user: userWithFullPath });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('department', 'dep_name');

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json({
      ...user.toObject(),
      profileImage: getProfileImageUrl(user.profileImage)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

