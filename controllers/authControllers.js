const jwt = require("jsonwebtoken"); 
const User = require("../models/User");
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const bcrypt = require("bcrypt");

const crypto = require("crypto");
const { createAccessToken } = require("../utils/token");
const { validateEmail } = require("../utils/validation");

const sendVerificationEmail = require("../utils/email");
const nodemailer = require('nodemailer');

require("dotenv").config();
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    
    // Validation de base
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Tous les champs obligatoires sont requis" });
    }

    // Règles de rôle
    const validRoles = ['Client', 'Agent', 'Admin'];
    const defaultRole = 'Client';

    // Si aucun rôle n'est spécifié ou si c'est une inscription publique
    if (!role) {
      req.body.role = defaultRole;
    }
    // Si un rôle est spécifié mais invalide
    else if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        msg: `Rôle invalide. Choix possibles: ${validRoles.join(', ')}` 
      });
    }
    // Si on tente de créer un Admin/Agent sans autorisation
    else if (role !== 'Client' && !req.user?.role === 'Admin') {
      return res.status(403).json({ 
        msg: "Seuls les administrateurs peuvent créer des comptes Agent/Admin" 
      });
    }

      // Vérification de l'existence de l'utilisateur
      const userExists = await User.findOne({ email });
      if (userExists) {
          return res.status(400).json({ msg: "Cet email est déjà enregistré" });
      }

      // Hachage du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");
      
      // Création de l'utilisateur
      const newUser = await User.create({ 
          name, 
          email, 
          password: hashedPassword, 
          role: role || "Client", 
          department: department || null, // Gestion explicite du null
          profileImage: "/uploads/default-profile.png", // Valeur par défaut
          verificationToken 
      });

      // Envoi de l'email de vérification
      await sendVerificationEmail(email, verificationToken);
      
      // Réponse réussie
      res.status(201).json({ 
          success: true,
          msg: "Compte créé ! Veuillez vérifier votre email pour activer votre compte.",
          user: {
              id: newUser._id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role
          }
      });
  } catch (err) {
      console.error("Erreur lors de l'inscription:", err);
      res.status(500).json({ 
          msg: "Erreur serveur lors de l'inscription",
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Identifiants incorrects" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Identifiants incorrects" });
    }

    // Création du token JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token, // Ajout du token dans la réponse
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
  
};exports.createUserByAdmin = async (req, res) => {
  try {
    // Vérifiez d'abord si un fichier a été uploadé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        msg: "Une image de profil est requise"
      });
    }

    const { name, email, password, role, department } = req.body;
    
    // Validation des données
    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({
        success: false,
        msg: "Tous les champs sont obligatoires"
      });
    }

    // Validation email
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false,
        msg: "Email invalide" 
      });
    }

    // Vérification de l'existence de l'utilisateur
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        msg: "Cet email est déjà utilisé"
      });
    }

    // Création de l'utilisateur
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      department,
      profileImage: `/uploads/${req.file.filename}`,
      verified: true // Admin crée des comptes déjà vérifiés
    });

    return res.status(201).json({
      success: true,
      msg: "Utilisateur créé avec succès",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department
      }
    });

  } catch (error) {
    console.error("Erreur création utilisateur:", error);
    return res.status(500).json({
      success: false,
      msg: "Erreur serveur",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 3600000; // 1h
    await user.save();

    const resetLink = `http://localhost:5173/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'eyabenhjaal@gmail.com', 
        pass: 'bnpq ryeb qqbl guny' 
      }
    });

    await transporter.sendMail({
      to: user.email,
      subject: 'Réinitialisation de mot de passe',
      html: `<p>Pour réinitialiser votre mot de passe, cliquez ici :</p>
             <a href="${resetLink}">${resetLink}</a>`
    });

    res.json({ message: 'Lien de réinitialisation envoyé à votre email.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({ 
      resetToken: token, 
      resetTokenExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: "Token invalide ou expiré" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error("Erreur reset password:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
exports.loginWithLinkedIn = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Code LinkedIn manquant.' });
  }

  try {
    // 1. Échanger le code contre un access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Utiliser le token pour obtenir les infos du profil
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const emailResponse = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const linkedInId = profileResponse.data.id;
    const name = profileResponse.data.localizedFirstName + ' ' + profileResponse.data.localizedLastName;
    const email = emailResponse.data.elements[0]['handle~'].emailAddress;

    // 3. Vérifier si utilisateur existe ou créer
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: 'linkedin', // optionnel, ou laisse vide
        role: 'Client',
        verified: true
      });
    }

    // 4. Générer un JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Erreur LinkedIn Login:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Échec de la connexion avec LinkedIn.' });
  }
};

exports.loginWithGoogle = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Logique de création ou de recherche de l'utilisateur...
    // Exemple :
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name,
        profilePicture: picture,
        role: 'Client', // ou autre par défaut
      });
    }

    // Générer JWT interne
    const jwtToken = generateJWT(user); // Votre logique ici

    res.status(200).json({ token: jwtToken, user });
  } catch (err) {
    console.error("Erreur Google Login:", err);
    res.status(500).json({ error: "Échec de la connexion avec Google" });
  }
};