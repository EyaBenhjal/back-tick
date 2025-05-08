const Category = require("../models/Category");
const Department = require("../models/Department");
const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { createTicketNotification } = require('./notificationController');
const { sendNotification } = require('../websocket');

const { validateObjectId } = require("../utils/validation");
exports.createTicket = async (req, res) => {
  try {
    // Validation des champs obligatoires
    const requiredFields = ['title', 'description', 'department', 'category', 'clientName', 'clientEmail'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          error: `Le champ ${field} est obligatoire`
        });
      }
    }

    // Vérification que la catégorie existe
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        error: "La catégorie sélectionnée n'existe pas"
      });
    }

    // Vérification que le département existe
    const departmentExists = await Department.findById(req.body.department);
    if (!departmentExists) {
      return res.status(400).json({
        success: false,
        error: "Le département sélectionné n'existe pas"
      });
    }

    // Construction des données du ticket
    const ticketData = {
      title: req.body.title,
      description: req.body.description,
      department: req.body.department,
      
      priority: req.body.priority || "medium",
      status: "new",
      requester: req.user.id,
      createdBy: req.user.id,
      createdByRole: req.user.role,
      clientDetails: {
        name: req.body.clientName,
        email: req.body.clientEmail
      },
      metadata: {
        requestType: req.body.requestType || "Incident",
        category: mongoose.Types.ObjectId(req.body.category), 
        timeSpent: req.body.timeSpent ? Number(req.body.timeSpent) : 0, 
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null

      },
      assignedAgent: req.body.assignedAgent || null, 
      resolutionNotes: req.body.resolutionNotes || null, 
      files: req.files || []
    };

    if (req.file) {
      ticketData.files = [{
        path: `/tickets/${req.file.filename}`,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        uploadedAt: new Date()
      }];
    }

    // Création du ticket
    const ticket = await Ticket.create(ticketData);

    // Peuplement des références pour la réponse
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("requester", "name email")
      .populate("department", "dep_name")
      .populate("assignedAgent", "name email")

      .populate({
        path: 'metadata.category',
        select: 'cat_name'
      });

    res.status(201).json({
      success: true,
      data: populatedTicket,
      message: "Ticket créé avec succès"
    });

  } catch (error) {
    console.error("Erreur création ticket:", error);

    // Gestion spécifique des erreurs de fichier
    if (error.message.includes('fichiers JPEG, PNG, JPG et PDF')) {
      return res.status(400).json({
        success: false,
        error: "Seuls les fichiers JPEG, PNG, JPG et PDF sont autorisés (max 10MB)"
      });
    }

    // Erreur générale
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création du ticket",
      systemMessage: error.message
    });
  }
};


    // Add this to your ticketControllers.js
exports.getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ success: false, error: "ID de ticket invalide" });
    }

    const ticket = await Ticket.findById(ticketId)
      .populate('requester', 'name email')
      .populate('department', 'dep_name')
      .populate('assignedAgent', 'name email')
      .populate('metadata.category', 'cat_name');

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé" });
    }

    // Authorization check
    // Commenter les vérifications d'autorisation temporairement
    // const isAdmin = req.user.role === "Admin";
    // const isAssignedAgent = ticket.assignedAgent?.toString() === req.user.id;
    // const isRequester = ticket.requester.toString() === req.user.id;
    // if (!isAdmin && !isAssignedAgent && !isRequester) {
    //   return res.status(403).json({
    //     success: false,
    //     error: "Non autorisé - Seuls l'admin, l'agent assigné ou le créateur peuvent voir ce ticket"
    //   });
    // }
    //}

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Erreur récupération ticket:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};
exports.getTickets = async (req, res) => {
  try {
    const { status, department, priority, requester } = req.query;
    const filter = {};

    // Filtres optionnels
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;
    if (requester) filter.requester = requester;

    // Filtrage selon le rôle de l'utilisateur
    if (req.user.role === 'Client') {
      filter.requester = req.user.id;
    } else if (req.user.role === 'Agent') {
      filter.assignedAgent = req.user.id; // Seulement les tickets assignés à cet agent
    }
    // Les administrateurs voient tous les tickets

    const tickets = await Ticket.find(filter)
      .populate('requester', 'name email')
      .populate('department', 'dep_name')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: tickets.length,
      data: tickets 
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des tickets:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur lors de la récupération des tickets" 
    });
  }
};



exports.updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ success: false, error: "ID de ticket invalide" });
    }

    const existingTicket = await Ticket.findById(ticketId);
    if (!existingTicket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé" });
    }

    // Autorisation: Admin OU Agent assigné OU Créateur
    const isAdmin = req.user.role === "Admin";
    const isAssignedAgent = existingTicket.assignedAgent?.toString() === req.user.id;
    const isRequester = existingTicket.requester.toString() === req.user.id;

    if (!isAdmin && !isAssignedAgent && !isRequester) {
      return res.status(403).json({
        success: false,
        error: "Non autorisé - Seuls l'admin, l'agent assigné ou le créateur peuvent modifier"
      });
    }

    const updates = {
      title: req.body.title || existingTicket.title,
      description: req.body.description || existingTicket.description,
      priority: req.body.priority || existingTicket.priority,
      status: req.body.status || existingTicket.status,
      department: req.body.department || existingTicket.department,
      metadata: {
        timeSpent: req.body.timeSpent || existingTicket.metadata?.timeSpent,
        requestType: req.body.requestType || existingTicket.metadata?.requestType,
        category: req.body.category || existingTicket.metadata?.category,
        dueDate: req.body.dueDate || existingTicket.metadata?.dueDate
      },
      resolutionNotes: req.body.resolutionNotes || existingTicket.resolutionNotes,
    };

    // Ajout du commentaire si envoyé
    if (req.body.comment) {
      updates.comment = req.body.comment;
    }
    if (req.body.dueDate) {
      updates.metadata.dueDate = new Date(req.body.dueDate);
    }
    if (req.body.assignedAgent && isAdmin) {
      updates.assignedAgent = req.body.assignedAgent;
    }

    // Gérer les fichiers si besoin
    if (req.file) {
      updates.attachments = [{
        path: req.file.path,
        originalName: req.file.originalname
      }];
    }

    // Update the ticket first
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      { $set: updates },
      { new: true, runValidators: true }
    )
    .populate('department requester assignedAgent');

    // Then handle notifications if status changed
    if (req.body.status && req.body.status !== existingTicket.status) {
      try {
        const notification = await createTicketNotification(
          updatedTicket, 
          req.user, 
          `Statut changé à ${updatedTicket.status}`
        );
        
        // Envoyer la notification en temps réel
        if (notification.clientNotification) {
          sendNotification(wss, updatedTicket.requester, {
            _id: notification.clientNotification._id,
            title: notification.clientNotification.title,
            message: notification.clientNotification.message,
            isRead: false,
            createdAt: new Date()
          });
        }
        
        if (notification.agentNotification && updatedTicket.assignedAgent) {
          sendNotification(wss, updatedTicket.assignedAgent, {
            _id: notification.agentNotification._id,
            title: notification.agentNotification.title,
            message: notification.agentNotification.message,
            isRead: false,
            createdAt: new Date()
          });
        }
      } catch (notificationError) {
        console.error("Erreur lors de la création de la notification:", notificationError);
      }
    }

    res.status(200).json({ success: true, data: updatedTicket });
  } catch (error) {
    console.error("Erreur mise à jour ticket:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

exports.getAgentsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!validateObjectId(departmentId)) {
      return res.status(400).json({ success: false, error: "ID de département invalide" });
    }

    const agents = await User.find({ department: departmentId, role: "Agent" })
      .select("name email role");

    res.json({ success: true, data: agents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

//  Assigner un agent à un ticket
exports.assignAgent = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { agentId } = req.body;

    if (!validateObjectId(ticketId) || !validateObjectId(agentId)) {
      return res.status(400).json({ success: false, error: "ID invalide." });
    }

    // Trouver le ticket et l'agent
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { assignedAgent: agentId, status: "in_progress" },
      { new: true }
    )
      .populate("assignedAgent", "name email")
      .populate("requester", "name");

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé." });
    }

    // Envoyer un email à l'agent
    if (ticket.assignedAgent && ticket.assignedAgent.email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: ticket.assignedAgent.email,
        subject: "Nouveau ticket assigné",
        html: `
          <h2>Bonjour ${ticket.assignedAgent.name},</h2>
          <p>Un nouveau ticket vous a été assigné :</p>
          <ul>
            <li><strong>Ticket ID:</strong> ${ticket._id}</li>
            <li><strong>Titre:</strong> ${ticket.title}</li>
            <li><strong>Demandeur:</strong> ${ticket.requester.name}</li>
            <li><strong>Priorité:</strong> ${ticket.priority}</li>
          </ul>
          <p>Merci de traiter ce ticket dans les meilleurs délais.</p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email de notification envoyé à l'agent: ${ticket.assignedAgent.email}`);
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Erreur lors de l'assignation du ticket:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// Clôturer un ticket
exports.closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { notes } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        status: "closed",
        endDate: new Date(),
        resolutionNotes: notes,
        closedBy: req.user.id
      },
      { new: true }
    ).populate("closedBy", "name");

    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Supprimer un ticket
exports.deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!validateObjectId(ticketId)) {
      return res.status(400).json({ success: false, error: "ID de ticket invalide" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé" });
    }

    // Vérifier les autorisations (seul le créateur ou un admin peut supprimer)
    if (ticket.requester.toString() !== req.user.id && req.user.role !== "Admin") {
      return res.status(403).json({ success: false, error: "Non autorisé" });
    }

    await Ticket.findByIdAndDelete(ticketId);
    res.json({ success: true, message: "Ticket supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du ticket:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la suppression du ticket" });
  }
};
// Récupérer tous les tickets (avec filtres optionnels)
exports.getTickets = async (req, res) => {
  try {
    const { status, department, priority, requester } = req.query;
    const filter = {};

    // Filtres optionnels
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;
    if (requester) filter.requester = requester;

    // Filtrage selon le rôle de l'utilisateur
    if (req.user.role === 'Client') {
      filter.requester = req.user.id; // Les clients ne voient que leurs tickets
    } else if (req.user.role === 'Agent') {
      filter.$or = [
        { assignedAgent: req.user.id }, // Tickets assignés à l'agent
        { department: req.user.department } // Tickets de son département
      ];
    }
    // Les administrateurs voient tous les tickets (pas de filtre supplémentaire)

    const tickets = await Ticket.find(filter)
      .populate('requester', 'name email')
      .populate('department', 'dep_name')
      .populate('assignedAgent', 'name email')
      .sort({ createdAt: -1 }); // Tri par date décroissante

    res.status(200).json({ 
      success: true, 
      count: tickets.length,
      data: tickets 
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des tickets:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur lors de la récupération des tickets" 
    });
  }
};