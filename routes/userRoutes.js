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

router.get("/list",verifyAccessToken, getAllUsers);
router.get("/me", verifyAccessToken, getCurrentUser); 

router.put("/:id",verifyAccessToken, upload.single('profileImage'), updateUser);
router.delete("/:id",verifyAccessToken, deleteUser);
router.get("/:id",verifyAccessToken, getUser);
module.exports = router;