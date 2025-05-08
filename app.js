const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Configuration CORS doit venir juste après l'initialisation de app
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

// Connexion MongoDB
const mongoUrl = process.env.MONGODB_URL;
if (!mongoUrl) {
  console.error("⚠️ ERREUR: MONGODB_URL n'est pas défini dans .env !");
  process.exit(1);
}

mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Mongodb connecté..."))
  .catch(err => {
    console.error("❌ Erreur de connexion à MongoDB:", err);
    process.exit(1);
  });

// Définition des routes
app.use("/api/auth", authRoutes);
app.use('/api', ticketRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/department", departmentRouter);
app.use("/api/client", clientRouter);
app.use("/api/users", userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/notifications", notificationRoutes);


// Créez un endpoint de secours pour les images
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
const { setupWebSocket, sendNotification } = require('./websocket');
const wss = setupWebSocket(server);

// Exposer wss pour l'utiliser dans les contrôleurs
app.set('wss', wss);