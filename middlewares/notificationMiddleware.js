const Notification = require('../models/Notification');

exports.checkNotificationOwnership = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        error: 'Notification non trouvée' 
      });
    }

    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Non autorisé - Vous ne pouvez modifier que vos propres notifications' 
      });
    }

    next();
  } catch (error) {
    console.error("Erreur vérification propriété notification:", error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur' 
    });
  }
};