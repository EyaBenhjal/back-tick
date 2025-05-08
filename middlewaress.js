const jwt = require("jsonwebtoken");
const User = require("./models/User");

const { ACCESS_TOKEN_SECRET } = process.env;

if (!ACCESS_TOKEN_SECRET) {
  console.error("❌ ACCESS_TOKEN_SECRET is not defined in environment variables.");
  process.exit(1);
}

// Middleware pour vérifier le token JWT
const verifyAccessToken = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({ status: false, msg: "Token not provided or invalid format" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ status: false, msg: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ status: false, msg: "Unauthorized" });
  }
};

// Middleware pour autoriser certains rôles
const authorizeRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ status: false, msg: "Access forbidden" });
  }
  next();
};

module.exports = {
  verifyAccessToken,
  authorizeRole
};
