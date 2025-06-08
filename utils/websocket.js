// utils/websocket.js
let ioInstance = null;

function setupWebSocket(server) {
  const { Server } = require("socket.io");

  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",  // Ton front-end
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`🔌 Client connecté : ${socket.id}`);

    // Exemple d’identification par userId (à adapter)
    socket.on("identify", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    socket.on("disconnect", () => {
      console.log(`Client déconnecté : ${socket.id}`);
    });
  });

  // Fonction pour envoyer une notification à un utilisateur spécifique
  const sendNotification = (userId, notificationData) => {
    console.log(`Envoi notification à ${userId}`);
    if (ioInstance) {
      ioInstance.to(userId).emit("notification", notificationData);
    }
  };

  return { io, sendNotification };
}

module.exports = { setupWebSocket };
