const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server, path: '/api/notifications/ws' });

  wss.on('connection', (ws, req) => {
    try {
      const token = new URLSearchParams(req.url.split('?')[1]).get('token');
      
      if (!token) {
        throw new Error('Token manquant');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      ws.userId = decoded.id;
      
      console.log(`Nouvelle connexion WebSocket pour l'utilisateur ${ws.userId}`);

      ws.on('close', () => {
        console.log(`Client déconnecté: ${ws.userId}`);
      });

      ws.on('error', (error) => {
        console.error(`Erreur WebSocket pour l'utilisateur ${ws.userId}:`, error);
      });

    } catch (error) {
      console.error('Erreur de connexion WebSocket:', error);
      ws.close(1008, 'Unauthorized');
    }
  });

  return wss;
};

function sendNotification(wss, userId, notificationData) {
  wss.clients.forEach(client => {
    if (client.userId === userId.toString()) {
      client.send(JSON.stringify({
        type: 'NEW_NOTIFICATION',
        data: notificationData
      }));
    }
  });
}

module.exports = { setupWebSocket, sendNotification };