const express = require("express");
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const NLPService = require('./services/nlpService');
const Solution = require('./models/Solution');
const Category = require('./models/Category');
const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // ou 3000 selon votre port frontend
  credentials: true
}));

// Middlewares
app.use(express.json());

// Routes
const departmentRouter = require("./routes/department.js");
const clientRouter = require("./routes/client.js");
const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require('./routes/ticketRoutes');
const profileRoutes = require("./routes/profileRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/category");
const notificationRoutes = require("./routes/notificationRoutes");
const chatbotRoutes = require('./routes/chatbotRoutes');

// Connexion MongoDB
const mongoUrl = process.env.MONGODB_URL;
if (!mongoUrl) {
  console.error("⚠️ ERREUR: MONGODB_URL n'est pas défini dans .env !");
  process.exit(1);
}

async function initializePredefinedSolutions() {
  const solutionsMap = {
    Electricité: [
      {
        title: "Disjoncteur saute",
        content: "1. Vérifiez si plusieurs appareils puissants fonctionnent en même temps\n2. Débranchez les équipements un à un\n3. Inspectez les prises ou câbles endommagés\n4. Si le problème persiste, contactez un électricien",
        keywords: ["disjoncteur", "sauter", "coupure", "électricité"]
      }
    ],
    Informatique: [
      {
        title: "Problème WiFi",
        content: "1. Redémarrer la box\n2. Vérifier les câbles\n3. Réinitialiser le réseau",
        keywords: ["wifi", "internet", "connexion", "réseau"]
      }
    ],
    Plomberie: [
      {
        title: "Fuite sous l'évier",
        content: "1. Coupez l'arrivée d'eau principale\n2. Identifiez l'origine de la fuite\n3. Remplacez ou resserrez les éléments défectueux",
        keywords: ["fuite", "évier", "tuyau", "siphon"]
      }
    ],
     Télévision: [
    {
      "title": "Écran noir ou sans signal",
      "content": "1. Vérifiez que la télévision est correctement alimentée.\n2. Contrôlez les branchements HDMI ou antenne.\n3. Relancez la recherche de chaînes ou réinitialisez l’appareil.",
      "keywords": ["télévision", "écran noir", "signal", "antenne", "HDMI"]
    }
  ]
  };

  try {
    for (const [categoryName, solutions] of Object.entries(solutionsMap)) {
      const category = await Category.findOne({ cat_name: categoryName });
      if (!category) continue;

      for (const solution of solutions) {
        await Solution.findOneAndUpdate(
          { title: solution.title, category: category._id },
          { ...solution, category: category._id },
          { upsert: true }
        );
      }
    }
    console.log('✅ Solutions prédéfinies initialisées');
  } catch (error) {
    console.error('❌ Erreur initialisation solutions:', error);
  }
}

async function startServer() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(mongoUrl, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log("✅ Mongodb connecté...");

    // Initialisation des solutions
    await initializePredefinedSolutions();

    // Définition des routes
    app.use("/api/auth", authRoutes);
    app.use('/api', ticketRoutes);
    app.use("/api/profile", profileRoutes);
    app.use("/api/department", departmentRouter);
    app.use("/api/client", clientRouter);
    app.use("/api/users", userRoutes);
    app.use("/api/category", categoryRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/chatbot", chatbotRoutes);
    app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
    
    if (process.env.NODE_ENV === "production") {
      app.use(express.static(path.resolve(__dirname, "../frontend/build")));
      app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "../frontend/build/index.html")));
    }
    
    app.use('/tickets', express.static(path.join(__dirname, 'public', 'tickets')));

    // Démarrage du serveur
    const port = process.env.PORT || 5000;
    const server = app.listen(port, () => {
      console.log(`🚀 Backend is running on port ${port}`);
    });

    // WebSocket
    const { setupWebSocket, sendNotification } = require('./websocket');
    const wss = setupWebSocket(server);

    // Exposer wss pour l'utiliser dans les contrôleurs
    app.set('wss', wss);
    app.use('/api/notifications', (req, res, next) => {
      req.wss = wss;
      next();
    }, notificationRoutes);

  } catch (error) {
    console.error("❌ Erreur lors du démarrage du serveur:", error);
    process.exit(1);
  }
}

startServer();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));