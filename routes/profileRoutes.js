const express = require("express");
const router = express.Router();
const { verifyAccessToken } = require("../middlewares/authMiddleware"); 
const { upload } = require("../middlewares/upload");
const { getProfile , updateProfile,removeSkill, addSkill} = require("../controllers/profileControllers");

router.get("/monprofil", verifyAccessToken, getProfile);
router.put("/up", verifyAccessToken, upload.single('profileImage'), updateProfile);
router.delete('/skills', verifyAccessToken, removeSkill);
router.post('/skillss', verifyAccessToken, addSkill);

module.exports = router;