const express = require("express");
const mongoose = require("mongoose");
mongoose.set('strictQuery', false);
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const NLPService = require('./services/nlpService');
const Solution = require('./models/Solution');
const Category = require('./models/Category');
const { setupWebSocket } = require('./websocket');

const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});
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
const statsRoutes= require('./routes/statsRoutes')
const availabilityRoutes = require("./routes/availabilityRoutes");

// Connexion MongoDB
const mongoUrl = process.env.MONGODB_URL;
if (!mongoUrl) {
  console.error("⚠️ ERREUR: MONGODB_URL n'est pas défini dans .env !");
  process.exit(1);
}


async function startServer() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(mongoUrl, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log("✅ Mongodb connecté...");

  
    // Définition des routes
    app.use("/api/auth", authRoutes);
    app.use('/api', ticketRoutes);
    app.use("/api/profile", profileRoutes);
    app.use("/api/department", departmentRouter);
    app.use("/api/client", clientRouter);
    app.use("/api/users", userRoutes);
    app.use("/api/category", categoryRoutes);
    app.use("/api/chatbot", chatbotRoutes);
    app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/api/stats', statsRoutes);
app.use("/api/availability", availabilityRoutes);

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
    const wss = setupWebSocket(server);
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
;