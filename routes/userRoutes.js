const express = require("express");
const router = express.Router();
const { 
  getAllUsers, 
  updateUser, 
  getCurrentUser,

  deleteUser, 
  getUser,
  upload 
} = require("../controllers/userController");
const { verifyAccessToken } = require("../middlewares/authMiddleware");

router.get("/list", getAllUsers);
router.get("/me", verifyAccessToken, getCurrentUser); 

router.put("/:id", upload.single('profileImage'), updateUser);
router.delete("/:id", deleteUser);
router.get("/:id", getUser);
module.exports = router;