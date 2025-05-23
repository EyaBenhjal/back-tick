const Ticket = require("../models/Ticket");
const Department = require("../models/Department");
const Category = require("../models/Category");
const mongoose = require("mongoose");

module.exports = {
  getTicketStats: async (req, res) => {
    try {
      // 1. Initialisation des filtres
      const userDepartment = req.user.department;
      const baseFilter = userDepartment ? { department: userDepartment } : {};
      const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate()-7));

      // 2. Requêtes parallélisées pour les statistiques de base
      const [
        totalTickets, 
        resolvedTickets, 
        openTickets,
        newTickets,
        totalDepartments,
        totalCategories
      ] = await Promise.all([
        Ticket.countDocuments(baseFilter),
        Ticket.countDocuments({ ...baseFilter, status: "resolved" }),
        Ticket.countDocuments({ ...baseFilter, status: "open" }),
        Ticket.countDocuments({ 
          ...baseFilter, 
          status: "new",
          createdAt: { $gte: sevenDaysAgo }
        }),
        Department.countDocuments(),
        Category.countDocuments()
      ]);

      // 3. Aggrégations pour les temps moyens
      const [resolutionStats, responseTimeStats] = await Promise.all([
        Ticket.aggregate([
          { $match: { ...baseFilter, status: "resolved" } },
          { 
            $group: {
              _id: null,
              avgResolution: { $avg: "$resolutionTime" },
              avgResponse: { $avg: "$firstResponseTime" }
            } 
          }
        ]),
        Ticket.aggregate([
          { $match: baseFilter },
          {
            $group: {
              _id: null,
              avgFirstResponse: { $avg: "$firstResponseTime" },
              avgResolution: { $avg: "$resolutionTime" }
            }
          }
        ])
      ]);

      // 4. Statistiques par catégorie
      const byCategory = await Ticket.aggregate([
        { $match: baseFilter },
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
            _id: "$categoryData.cat_name",
            total: { $sum: 1 },
            resolved: { 
              $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } 
            }
          } 
        },
        { 
          $project: { 
            name: "$_id", 
            value: "$total", 
            resolved: 1, 
            _id: 0 
          } 
        }
      ]);

      // 5. Statistiques par département (uniquement pour les admins)
      let byDepartment = [];
      if (!userDepartment) {
        byDepartment = await Ticket.aggregate([
          {
            $lookup: {
              from: "departments",
              localField: "department",
              foreignField: "_id",
              as: "departmentData"
            }
          },
          { $unwind: "$departmentData" },
          { 
            $group: { 
              _id: "$departmentData.dep_name",
              total: { $sum: 1 },
              resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } }
            } 
          },
          { 
            $project: { 
              name: "$_id", 
              value: "$total", 
              resolved: 1, 
              _id: 0 
            } 
          }
        ]);
      }

      // 6. Performance des agents - VERSION CORRIGÉE
      const agentStats = await Ticket.aggregate([
        { $match: baseFilter },
        {
          $lookup: {
            from: "users",
            localField: "assignedAgent",
            foreignField: "_id",
            as: "agentData"
          }
        },
        { $unwind: "$agentData" },
        {
          $group: {
            _id: "$agentData._id",
            name: { $first: "$agentData.name" },
            email: { $first: "$agentData.email" },
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
            avgResolution: { $avg: "$resolutionTime" },
            avgResponse: { $avg: "$firstResponseTime" }
          }
        },
        { 
          $project: { 
            name: 1,
            email: 1,
            total: 1,
            resolved: 1,
            resolutionRate: { 
              $cond: [
                { $eq: ["$total", 0] },
                0,
                { $multiply: [{ $divide: ["$resolved", "$total"] }, 100] }
              ]
            },
            avgResolution: 1,
            avgResponse: 1,
            _id: 0
          }
        }
      ]);

      // 7. Préparation de la réponse
      const response = {
        totals: {
          all: totalTickets,
          resolved: resolvedTickets,
          open: openTickets,
          new: newTickets,
          departments: totalDepartments,
          categories: totalCategories,
          resolutionRate: totalTickets > 0 
            ? parseFloat((resolvedTickets / totalTickets * 100).toFixed(1))
            : 0
        },
        times: {
          resolution: resolutionStats[0]?.avgResolution || 0,
          response: resolutionStats[0]?.avgResponse || 0,
          firstResponse: responseTimeStats[0]?.avgFirstResponse || 0,
          avgResolution: responseTimeStats[0]?.avgResolution || 0
        },
        byCategory,
        byDepartment,
        agents: agentStats
      };

      res.json(response);

    } catch (error) {
      console.error("Error in getTicketStats:", error);
      res.status(500).json({ 
        success: false,
        error: "Erreur serveur",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};