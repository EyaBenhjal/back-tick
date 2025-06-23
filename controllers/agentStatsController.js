const Ticket = require("../models/Ticket");
const User = require("../models/User");

module.exports = {
  getAgentStats: async (req, res) => {
    try {
      // Récupérer l'ID de l'agent connecté depuis le token
      const agentId = req.user._id;
       const tickets = await Ticket.find({ 
    assignedAgent: agentId,
    status: { $in: ['new', 'in_progress', 'resolved'] }
  });

  const counts = {
    new: tickets.filter(t => t.status === 'new').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

      // Vérifier que l'utilisateur est bien un agent
      const agent = await User.findById(agentId);
      if (!agent || agent.role !== 'Agent') {
        return res.status(403).json({ error: "Accès réservé aux agents" });
      }

      // Statistiques de base pour l'agent
      const [
        totalAssigned,
        resolvedTickets,
        inProgressTickets,
        newTickets,
        overdueTickets
      ] = await Promise.all([
        Ticket.countDocuments({ assignedAgent: agentId }),
  Ticket.countDocuments({ assignedAgent: agentId, status: 'resolved' }), // → resolvedTickets
  Ticket.countDocuments({ assignedAgent: agentId, status: 'in_progress' }), 
        Ticket.countDocuments({ 
          assignedAgent: agentId,
          status: 'new'
        }),
        Ticket.countDocuments({
          assignedAgent: agentId,
          'metadata.dueDate': { $lt: new Date() },
          status: { $nin: ['resolved', 'closed','new'] }
        })
      ]);

      // Temps moyen de résolution pour l'agent
      const resolutionStats = await Ticket.aggregate([
        {
          $match: {
            assignedAgent: agentId,
            status: { $regex: /resolved|closed/i },
            updatedAt: { $exists: true },
            createdAt: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgResolutionTime: {
              $avg: {
                $divide: [
                  { $subtract: ["$updatedAt", "$createdAt"] },
                  1000 * 60 * 60 // Conversion en heures
                ]
              }
            },
            minResolutionTime: {
              $min: {
                $divide: [
                  { $subtract: ["$updatedAt", "$createdAt"] },
                  1000 * 60 * 60
                ]
              }
            },
            maxResolutionTime: {
              $max: {
                $divide: [
                  { $subtract: ["$updatedAt", "$createdAt"] },
                  1000 * 60 * 60
                ]
              }
            }
          }
        }
      ]);

      // Temps moyen passé par ticket pour l'agent
      const timeSpentStats = await Ticket.aggregate([
        {
          $match: {
            assignedAgent: agentId,
            'metadata.timeSpent': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            avgTimeSpent: { $avg: "$metadata.timeSpent" },
            totalTimeSpent: { $sum: "$metadata.timeSpent" }
          }
        }
      ]);

      // Statistiques par catégorie pour l'agent
      const byCategory = await Ticket.aggregate([
        {
          $match: { assignedAgent: agentId }
        },
        {
          $lookup: {
            from: "categories",
            localField: "metadata.category",
            foreignField: "_id",
            as: "categoryData"
          }
        },
        { $unwind: "$categoryData" },
        {
          $group: {
            _id: "$categoryData._id",
            name: { $first: "$categoryData.cat_name" },
            total: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: "$status", regex: /resolved/i } },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]);

      // Évolution mensuelle des tickets pour l'agent
      const monthlyTrend = await Ticket.aggregate([
        {
          $match: { 
            assignedAgent: agentId,
            createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } // 6 derniers mois
          }
        },
        {
          $project: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
            status: 1
          }
        },
        {
          $group: {
            _id: {
              month: "$month",
              year: "$year"
            },
            created: { $sum: 1 },
            resolved: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: "$status", regex: /resolved/i } },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        {
          $project: {
            _id: 0,
            month: "$_id.month",
            year: "$_id.year",
            created: 1,
            resolved: 1,
            label: {
              $let: {
                vars: {
                  monthsInFrench: ["", "Janv", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
                },
                in: {
                  $arrayElemAt: ["$$monthsInFrench", "$_id.month"]
                }
              }
            }
          }
        }
      ]);

      // Satisfaction client pour les tickets de l'agent
      const satisfactionStats = await Ticket.aggregate([
        {
          $match: {
            assignedAgent: agentId,
            satisfaction: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: "$satisfaction",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Préparation de la réponse
      const response = {
        agent: {
          name: agent.name,
          email: agent.email,
          department: agent.department
        },
        stats: {
          totalAssigned,
        resolved: counts.resolved,
      inProgress: counts.inProgress,
          new: newTickets,
          overdue: overdueTickets,
          resolutionRate: totalAssigned > 0 
            ? parseFloat((resolvedTickets / totalAssigned * 100).toFixed(1))
            : 0,
          avgResolutionTime: resolutionStats[0]?.avgResolutionTime?.toFixed(1) || 0,
          avgTimeSpent: timeSpentStats[0]?.avgTimeSpent?.toFixed(1) || 0
        },
        byCategory,
        monthlyTrend,
        satisfaction: satisfactionStats
      };

      res.json(response);
    } catch (error) {
      console.error("Error in getAgentStats:", error);
      res.status(500).json({ 
        error: "Erreur serveur",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};