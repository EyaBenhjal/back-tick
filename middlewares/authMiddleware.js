const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ 
        status: false, 
        message: "Authorization header manquant ou invalide" 
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded.id).select("-password -refreshToken");

    if (!user) {
      return res.status(401).json({ status: false, message: "Utilisateur introuvable" });
    }

    req.user = user;
    next();
  } catch (err) {
    let message = "Échec de l'authentification";
    if (err.name === "TokenExpiredError") {
      message = "Token expiré. Veuillez vous reconnecter.";
    } else if (err.name === "JsonWebTokenError") {
      message = "Token invalide.";
    }

    return res.status(401).json({ status: false, message });
  }
};

module.exports = { verifyAccessToken };
