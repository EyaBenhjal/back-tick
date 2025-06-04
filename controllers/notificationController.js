const Notification = require('../models/Notification');

const User = require('../models/User');
const { validateObjectId } = require('../utils/validation');
const { sendNotification } = require('../websocket');

module.exports.createTicketNotification = async (ticket, actionUser, message,wss) => {
  try {
    let clientNotification, agentNotification;

    clientNotification = await Notification.create({
      userId: ticket.requester,
      ticketId: ticket._id,
      title: `Ticket ${ticket.ticketNumber} mis à jour`,
      message: message,
      type: 'status_change',
      isRead: false
    });

    // Envoyer la notification via WebSocket
    sendNotification(wss, ticket.requester, {
      _id: clientNotification._id,
      title: clientNotification.title,
      message: clientNotification.message,
      isRead: false,
      createdAt: new Date()
    });

    // Notification pour l'agent si assigné
    if (ticket.assignedAgent) {
      agentNotification = await Notification.create({
        userId: ticket.assignedAgent,
        ticketId: ticket._id,
        title: `Ticket ${ticket.ticketNumber} assigné`,
        message: `Vous avez été assigné au ticket par ${actionUser.name}`,
        type: 'assignment',
        isRead: false
      });

      sendNotification(wss, ticket.assignedAgent, {
        _id: agentNotification._id,
        title: agentNotification.title,
        message: agentNotification.message,
        isRead: false,
        createdAt: new Date()
      });
    }

    return { clientNotification, agentNotification };
  } catch (error) {
    console.error("Erreur création notification:", error);
    throw error;
  }
};
const createNotification = async (req, res) => {
  try {
    const { userId, ticketId, title, message, type } = req.body;
    const notification = new Notification({
      userId,
      ticketId,
      title,
      message,
      type,
    });
    await notification.save();

    // WebSocket temps réel
    if (req.wss) {
      const { sendNotification } = require('../websocket');
      sendNotification(req.wss, userId, notification);
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createCommentNotification = async (ticket, commentAuthor, commentText, wss) => {
  try {
    const usersToNotify = new Set();

    // Notifier le client s'il n'est pas l'auteur du commentaire
    if (ticket.requester?.toString() !== commentAuthor._id.toString()) {
      usersToNotify.add(ticket.requester.toString());
    }

    // Notifier l'agent assigné s'il n'est pas l'auteur du commentaire
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

      // Envoi via WebSocket
      sendNotification(wss, userId, {
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




const getUserNotifications = async (req, res) => {
  const userId = req.user.id;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, error: "ID de ticket invalide" });
  }
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error("Erreur récupération notifications :", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
  console.log(req.user.id)
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
// Version pour les requêtes API directes
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