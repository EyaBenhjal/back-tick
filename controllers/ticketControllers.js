const Category = require("../models/Category");
const Department = require("../models/Department");
const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { createTicketNotification,createCommentNotification} = require('./notificationController');
const { sendNotification } = require('../websocket');
const path = require('path');
const fs = require('fs');
const Notification = require('../models/Notification');
const { createAndSendNotification } = require('../utils/notificationService');

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

    // Validation des IDs
    if (!mongoose.Types.ObjectId.isValid(req.body.department)) {
      return res.status(400).json({ error: "ID de département invalide" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
      return res.status(400).json({ error: "ID de catégorie invalide" });
    }

    // Vérification des existences
    const [categoryExists, departmentExists] = await Promise.all([
      Category.findById(req.body.category),
      Department.findById(req.body.department)
    ]);

    if (!categoryExists) {
      return res.status(400).json({ error: "Catégorie inexistante" });
    }

    if (!departmentExists) {
      return res.status(400).json({ error: "Département inexistant" });
    }

    // Trouver un agent disponible dans ce département
    const availableAgent = await User.findOne({
      department: req.body.department,
      role: 'Agent',
      isAvailable: true
    }).sort({ ticketCount: 1 }); // Prendre l'agent avec le moins de tickets

    // Construction des données du ticket
    const ticketData = {
      title: req.body.title,
      description: req.body.description,
      department: req.body.department,
      priority: req.body.priority || "medium",
      status: "new",
      requester: req.user?.id || null,
      createdBy: req.user?.id || null,
      createdByRole: req.user?.role || "Client",
      clientDetails: {
        name: req.body.clientName,
        email: req.body.clientEmail
      },
      metadata: {
        requestType: req.body.requestType || "Incident",
        category: req.body.category,
        timeSpent: 0,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
      },
      assignedAgent: availableAgent?._id || null, // Assignation automatique si agent disponible
      files: []
    };

    // Gestion des fichiers
    if (req.files?.length > 0) {
      ticketData.files = req.files.map(file => ({
        path: `/tickets/${file.filename}`,
        originalName: file.originalname,
        fileType: file.mimetype,
        uploadedAt: new Date()
      }));
    }
// Création du ticket
const ticket = await Ticket.create(ticketData);

const actionUser = req.user?.id || null;
const message = `Ticket créé par ${req.user?.role || 'Client'}`;
const wss = req.app.get('wss'); // supposons que tu aies attaché `wss` à l'app Express

await createTicketNotification(ticket, actionUser, message, wss);
    // Mise à jour du compteur de tickets de l'agent si assigné
    if (availableAgent) {
      await User.findByIdAndUpdate(availableAgent._id, {
        $inc: { ticketCount: 1 }
      });
    }

    // Peuplement pour la réponse
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('department', 'dep_name')
      .populate('assignedAgent', 'name email')
      .populate('metadata.category', 'cat_name');

    // Notification si agent assigné
    if (availableAgent) {
      await createAndSendNotification({
        recipient: availableAgent._id,
        title: 'Nouveau Ticket Assigné',
        message: `Vous avez été assigné au ticket: ${ticket.title}`,
        ticket: ticket._id
      });

      // Envoi d'email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: availableAgent.email,
        subject: `Nouveau Ticket Assigné (#${ticket._id})`,
        html: `
          <div>
            <h2>Bonjour ${availableAgent.name},</h2>
            <p>Un nouveau ticket vous a été assigné :</p>
            <p><strong>Titre:</strong> ${ticket.title}</p>
            <p><strong>Priorité:</strong> ${ticket.priority}</p>
          </div>
        `
      });
    }

    res.status(201).json({
      success: true,
      data: populatedTicket,
      message: "Ticket créé avec succès" + (availableAgent ? " et assigné à un agent" : "")
    });

  } catch (error) {
    console.error("Erreur création ticket:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la création du ticket",
      details: error.message
    });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const { ticketId, fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ success: false, error: "ID de ticket invalide" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé" });
    }

    const file = ticket.files.id(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: "Fichier non trouvé" });
    }

    const filePath = path.join(__dirname, '..', 'uploads', file.path.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Fichier introuvable sur le serveur" });
    }

    res.download(filePath, file.originalName);
  } catch (error) {
    console.error("Erreur téléchargement fichier:", error);
    res.status(500).json({ success: false, error: "Erreur lors du téléchargement du fichier" });
  }
};

exports.viewFile = async (req, res) => {
  try {
    const { ticketId, fileId } = req.params;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé" });
    }

    const file = ticket.files.id(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: "Fichier non trouvé" });
    }

    const filePath = path.join(__dirname, '..', 'uploads', file.path.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Fichier introuvable sur le serveur" });
    }

    res.setHeader('Content-Type', file.fileType);
    res.sendFile(filePath);
  } catch (error) {
    console.error("Erreur affichage fichier:", error);
    res.status(500).json({ success: false, error: "Erreur lors de l'affichage du fichier" });
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
if (req.body.status === 'resolved' && existingTicket.status !== 'resolved') {
      try {
        // Récupérer les détails du client
        const clientEmail = updatedTicket.clientDetails?.email || updatedTicket.requester?.email;
        const clientName = updatedTicket.clientDetails?.name || updatedTicket.requester?.name;

        if (clientEmail) {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: clientEmail,
  subject: `Votre ticket #${updatedTicket._id} a été résolu`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <img src="cid:logo" alt="Logo" style="width: 150px; display: block; margin: 0 auto 20px;" />
      <h2 style="color: #333;">Bonjour ${clientName},</h2>
      <p>Nous vous informons que votre ticket a été marqué comme résolu :</p>
      <ul style="list-style-type: none; padding: 0;">
        <li><strong>Ticket ID:</strong> ${updatedTicket._id}</li>
        <li><strong>Titre:</strong> ${updatedTicket.title}</li>
        <li><strong>Statut:</strong> Résolu</li>
        ${updatedTicket.resolutionNotes ? `<li><strong>Notes de résolution:</strong> ${updatedTicket.resolutionNotes}</li>` : ''}
      </ul>
      <p>Si vous avez d'autres questions, n'hésitez pas à nous contacter.</p>
      <p style="margin-top: 30px;">Cordialement,<br>L'équipe de support</p>
    </div>
  `,
  attachments: [
    {
      filename: 'logo.png',
      path: path.join(__dirname, '../public/uploads/logo.png'), // Chemin absolu correct
      cid: 'logo' // Correspond au cid utilisé dans <img src="cid:logo" />
    }
  ]
};

          await transporter.sendMail(mailOptions);
          console.log(`Email de notification envoyé au client: ${clientEmail}`);
        }
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email au client:", emailError);
        // Ne pas bloquer la réponse même si l'email échoue
      }
    }
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
exports.assignAgent = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { agentId } = req.body;

    if (!validateObjectId(ticketId) || !validateObjectId(agentId)) {
      return res.status(400).json({ success: false, error: "ID invalide." });
    }

    // Récupérer le ticket
    const ticket = await Ticket.findById(ticketId).populate("requester", "name");
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé." });
    }

    // Vérifier que l'agent existe et qu'il est valide
    const agent = await User.findById(agentId);
    if (!agent || agent.role !== "Agent") {
      return res.status(400).json({ success: false, error: "L'utilisateur assigné n'est pas un agent valide." });
    }

    // Vérifier que l'agent appartient au même département
    if (agent.department.toString() !== ticket.department.toString()) {
      return res.status(400).json({ success: false, error: "L'agent n'appartient pas au même département que le ticket." });
    }

    // Mettre à jour le ticket
    ticket.assignedAgent = agentId;
    ticket.status = "in_progress";
    await ticket.save();

    await ticket.populate("assignedAgent", "name email");

    // Envoyer un email à l'agent
    if (ticket.assignedAgent?.email) {
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <img src="cid:logo" alt="Logo" style="width: 150px; display: block; margin: 0 auto 20px;" />
            <h2>Bonjour ${ticket.assignedAgent.name},</h2>
            <p>Un nouveau ticket vous a été assigné :</p>
            <ul style="list-style-type: none; padding: 0;">
              <li><strong>Ticket ID:</strong> ${ticket._id}</li>
              <li><strong>Titre:</strong> ${ticket.title}</li>
              <li><strong>Demandeur:</strong> ${ticket.requester.name}</li>
              <li><strong>Priorité:</strong> ${ticket.priority}</li>
            </ul>
            <p>Merci de traiter ce ticket dans les meilleurs délais.</p>
          </div>
        `,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, '../public/uploads/logo.png'),
            cid: 'logo'
          }
        ]
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

    // Envoyer un email à l'agent avec logo
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <img src="cid:logo" alt="Logo" style="width: 150px; display: block; margin: 0 auto 20px;" />
            <h2>Bonjour ${ticket.assignedAgent.name},</h2>
            <p>Un nouveau ticket vous a été assigné :</p>
            <ul style="list-style-type: none; padding: 0;">
              <li><strong>Ticket ID:</strong> ${ticket._id}</li>
              <li><strong>Titre:</strong> ${ticket.title}</li>
              <li><strong>Demandeur:</strong> ${ticket.requester.name}</li>
              <li><strong>Priorité:</strong> ${ticket.priority}</li>
            </ul>
            <p>Merci de traiter ce ticket dans les meilleurs délais.</p>
          </div>
        `,
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, '../public/uploads/logo.png'),
            cid: 'logo'
          }
        ]
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

exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const ticketId = req.params.ticketId; 

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket introuvable' });
    }

    const comment = {
      author: req.user._id,
      text,
      createdAt: new Date()
    };

    ticket.comments.push(comment);
    await ticket.save();

    // ✅ Envoie notification via service utilitaire
    await createCommentNotification(ticket, req.user, text, req.app.get('wss'));

    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("Erreur ajout commentaire :", err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
// Mettre à jour un commentaire
exports.updateComment = async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.user._id;
    const { ticketId, commentId } = req.params;

    const ticket = await Ticket.findById(ticketId)
      .populate('comments.author', 'name role');

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé" });
    }

    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: "Commentaire non trouvé" });
    }

    // Vérifier que l'utilisateur est l'auteur du commentaire ou admin
    const isAuthor = comment.author._id.toString() === userId.toString();
    const isAdmin = req.user.role === "Admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: "Vous ne pouvez modifier que vos propres commentaires" 
      });
    }

    comment.text = text;
    comment.updatedAt = new Date();
    await ticket.save();

    res.status(200).json({ 
      success: true, 
      data: comment,
      message: "Commentaire mis à jour avec succès"
    });
  } catch (error) {
    console.error("Erreur mise à jour commentaire:", error);
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur lors de la mise à jour du commentaire" 
    });
  }
};

// Supprimer un commentaire
exports.deleteComment = async (req, res) => {
  try {
    const { ticketId, commentId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket non trouvé" });
    }

    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Commentaire non trouvé" });
    }

    // Vérifier que l’utilisateur est admin ou auteur du commentaire
    if (userRole !== "Admin" && comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Non autorisé à supprimer ce commentaire" });
    }

    comment.remove();
    await ticket.save();

    res.status(200).json({ message: "Commentaire supprimé avec succès" });
  } catch (error) {
    console.error("Erreur suppression commentaire:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};


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
      .populate('metadata.category', 'cat_name')
      .populate('comments.author', 'name role'); // Ajout de cette ligne

    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé" });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Erreur récupération ticket:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
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


// Récupérer tous les tickets 
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


exports.downloadFile = async (req, res) => {
  try {
    const { ticketId, fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(ticketId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, error: "ID invalide" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Ticket non trouvé" });
    }

    const file = ticket.files.id(fileId);
    if (!file) {
      return res.status(404).json({ success: false, error: "Fichier non trouvé dans le ticket" });
    }

    // Correction du chemin ici - utilisez 'public/tickets' au lieu de 'uploads'
    const filePath = path.join(__dirname, '..', 'public', file.path);
    console.log("Chemin du fichier:", filePath); // Pour le débogage

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Fichier introuvable sur le serveur" });
    }

    // Définir les en-têtes pour forcer le téléchargement
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.fileType || 'application/octet-stream');

    // Créer un stream de lecture et l'envoyer
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Erreur de téléchargement:", error);
    res.status(500).json({ success: false, error: "Erreur lors du téléchargement du fichier" });
  }
};

exports.updateSatisfaction= async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { satisfaction } = req.body;

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        satisfaction,
      },
      { new: true }
    );

    if (!updatedTicket) {
      return res.status(404).json({ message: "Ticket non trouvé" });
    }

    res.status(200).json({ message: "Satisfaction mise à jour", ticket: updatedTicket });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
}
