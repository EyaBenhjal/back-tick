const express = require("express");
const router = express.Router();
const { signup, login, createUserByAdmin, loginWithLinkedIn,loginWithGoogle } = require("../controllers/authControllers");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });
const userController = require("../controllers/authControllers");
const { verifyAccessToken, restrictTo } = require("../middlewares/authMiddleware");
router.get("/verify/:token", async (req, res) => {
    try {
        console.log("🔑 Token reçu via URL :", req.params.token);

        //² Trouver l'utilisateur avec ce token
        const user = await User.findOne({ verificationToken: req.params.token });

        if (!user) {
            return res.status(400).send("❌ Lien invalide ou expiré.");
        }

        // Vérifier l'utilisateur et supprimer le token
        user.verified = true;
        user.verificationToken = undefined; // Nettoyage après vérification
        await user.save();

        res.send("✅ Votre compte a été vérifié avec succès !");
    } catch (error) {
        console.error("❌ Erreur lors de la vérification :", error);
        res.status(400).send("❌ Lien invalide ou expiré.");
    }
});



// Routes beginning with /api/auth
router.post("/signup", signup);
router.post("/login", login);
router.post("/admin/create-user", upload.single('profileImage'), createUserByAdmin);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);
router.get('/auth/linkedin/callback', loginWithLinkedIn);
router.post("/google", loginWithGoogle);

module.exports = router;
