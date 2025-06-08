let sendNotificationFn = null;

function initialize(sendNotification) {
  sendNotificationFn = sendNotification;
}

function sendNotificationToUser(userId, notification) {
  if (!sendNotificationFn) {
    throw new Error("sendNotification not initialized");
  }
  sendNotificationFn(userId, notification);
}

module.exports = { initialize, sendNotificationToUser };
