// utils/notificationService.js
const Notification = require('../models/Notification');
const { sendNotification } = require('../websocket');

const createAndSendNotification = async ({ userId, ticketId, title, message, type }, wssInstance = null) => {
  const notification = new Notification({
    userId,
    ticketId,
    title,
    message,
    type,
  });

 console.log('Creating notification for user:', ticket.requester);

await notification.save();

console.log('Notification saved:', notification);

  if (wssInstance) {
    sendNotification(wssInstance, userId, notification);
  }

  return notification;
};

module.exports = { createAndSendNotification };
