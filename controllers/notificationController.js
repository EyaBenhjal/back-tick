const Notification = require('../models/Notification');
const { sendNotification } = require('../utils/emitter.js');

const User = require('../models/User');
const { validateObjectId } = require('../utils/validation');
const emitter = require("../utils/emitter");
exports.createTicketNotification = async (assignedAgentId, ticketInfo) => {
  try {
    const notification = {
      title: "Nouveau ticket assigné",
      message: `Un ticket vient de vous être assigné: ${ticketInfo?.title || 'Ticket'}`,
      userId: assignedAgentId,
      ticketId: ticketInfo?._id,
    };

    await Notification.create(notification);

    emitter.sendNotificationToUser(assignedAgentId.toString(), {
      ...notification,
      date: new Date()
    });

    console.log("Notification enregistrée et envoyée via WebSocket");

  } catch (error) {
    console.error("Erreur lors de la création de la notification de ticket:", error);
  }
};


exports.createGenericNotification = async ({ recipientId, title, message, ticketId }) => {
  try {
    const notification = {
      title,
      message,
      ticketId,
      date: new Date(),
    };

    emitter.sendNotificationToUser(recipientId.toString(), notification);
    console.log("✅ Notification envoyée au créateur du ticket via WebSocket");

  } catch (error) {
    console.error("❌ Erreur lors de la notification générique :", error);
  }
};


exports.createCommentNotification = async (ticket, commentAuthor, commentText) => {
  try {
    const usersToNotify = new Set();

    if (ticket.requester?.toString() !== commentAuthor._id.toString()) {
      usersToNotify.add(ticket.requester.toString());
    }

    if (ticket.assignedAgent &&
        ticket.assignedAgent.toString() !== commentAuthor._id.toString()) {
      usersToNotify.add(ticket.assignedAgent.toString());
    }

    const notifications = [];

    const notificationPromises = Array.from(usersToNotify).map(async userId => {
      const notification = await Notification.create({
        userId,
        ticketId: ticket._id,
        title: `Ticket ${ticket.ticketNumber || ticket._id} mis à jour`,
        message: `${commentAuthor.name} a ajouté un commentaire : "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
        type: 'new_comment',
        isRead: false
      });

      notifications.push(notification);

      sendNotification(userId, {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        isRead: false,
        createdAt: notification.createdAt
      });
    });

    await Promise.all(notificationPromises);
    return notifications;
  } catch (error) {
    console.error("Erreur création notification commentaire:", error);
    throw error;
  }
};






// notificationController.js
exports.getAdminNotifications = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const notifications = await Notification.find()
    .sort({ createdAt: -1 })
    .populate('userId', 'name role')
    .populate('ticketId');
  
  res.json({ success: true, notifications });
};

exports.createNotification = async (req, res) => {
  try {
    const { userId, ticketId, title, message, type } = req.body;
    
    if (!userId || !title || !message || !type) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs obligatoires doivent être fournis'
      });
    }

    if (!validateObjectId(userId) || (ticketId && !validateObjectId(ticketId))) {
      return res.status(400).json({
        success: false,
        error: 'ID utilisateur ou ticket invalide'
      });
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    const notification = await Notification.create({
      userId,
      ticketId,
      title,
      message,
      type
    });

    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Erreur création notification:", error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      systemMessage: error.message
    });
  }
};


exports.getUserNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({
      userId: req.user.id
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('ticketId', 'ticketNumber status')
    .populate('userId', 'name');

    const total = await Notification.countDocuments({ userId: req.user.id });
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      isRead: false 
    });

    res.status(200).json({
      success: true,
      notifications,
      total,
      unreadCount,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Erreur récupération notifications:", error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification non trouvée ou non autorisée'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Erreur marquage comme lu:", error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      systemMessage: error.message
    });
  }
};

// notificationController.js
exports.getAdminNotifications = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const notifications = await Notification.find()
    .sort({ createdAt: -1 })
    .populate('userId', 'name role')
    .populate('ticketId');
  
  res.json({ success: true, notifications });
};