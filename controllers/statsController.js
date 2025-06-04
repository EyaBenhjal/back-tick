const Ticket = require("../models/Ticket");
const Department = require("../models/Department");
const Category = require("../models/Category");
const User = require("../models/User");

// Dans statsController.js
const getTicketStats = async (req, res) => {
  try {
    const { period } = req.query;
    let startDate = new Date();

    // Définition de la période
    switch(period) {
      case '1w':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1); // Par défaut 1 mois
    }

    // Vérification que le token est valide
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

   const useWeek = period === '1w';
  const timeField = useWeek ? 'week' : 'month';

const monthlyTrend = await Ticket.aggregate([
  {
    $match: { createdAt: { $gte: startDate } }
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
      monthName: {
        $let: {
          vars: {
            monthsInFrench: ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
          },
          in: {
            $arrayElemAt: ["$$monthsInFrench", "$_id.month"]
          }
        }
      },
      label: {
        $concat: [
          {
            $let: {
              vars: {
                monthsInFrench: ["", "Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"]
              },
              in: {
                $arrayElemAt: ["$$monthsInFrench", "$_id.month"]
              }
            }
          },
          " ",
          { $toString: "$_id.year" }
        ]
      }
    }
  }
]);

    const [
      totalTickets,
      resolvedTickets,
      totalDepartments,
      totalCategories,
      totalUsers,
      totalAgents,
      totalClients,
      newTickets,
      inProgressTickets,
      overdueTickets
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: { $regex: /resolved/i } }),
      Department.countDocuments(),
      Category.countDocuments(),
      User.countDocuments(),
      User.countDocuments({ role: 'Agent' }),
      User.countDocuments({ role: 'Client' }),
      Ticket.countDocuments({ status: 'new' }),
      Ticket.countDocuments({ status: 'in_progress' }),
      Ticket.countDocuments({
        'metadata.dueDate': { $lt: new Date() },
        status: { $nin: ['resolved', 'closed'] }
      })
    ]);

    const resolutionStats = await Ticket.aggregate([
      {
        $match: {
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
                1000 * 60 * 60
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

    const timeSpentStats = await Ticket.aggregate([
      {
        $match: {
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

    const byCategory = await Ticket.aggregate([
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
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $regexMatch: { input: "$status", regex: /resolved/i } },
                {
                  $divide: [
                    { $subtract: ["$updatedAt", "$createdAt"] },
                    1000 * 60 * 60
                  ]
                },
                null
              ]
            }
          },
          avgTimeSpent: { $avg: "$metadata.timeSpent" }
        }
      },
      {
        $project: {
          _id: 0,
          name: 1,
          total: 1,
          resolved: 1,
          avgResolutionTime: { $round: ["$avgResolutionTime", 2] },
          avgTimeSpent: { $round: ["$avgTimeSpent", 2] }
        }
      }
    ]);

    const agentPerformance = await Ticket.aggregate([
      {
        $match: {
          assignedAgent: { $exists: true, $ne: null }
        }
      },
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
          _id: "$assignedAgent",
          agentName: { $first: "$agentData.name" },
          totalAssigned: { $sum: 1 },
          resolvedCount: {
            $sum: {
              $cond: [
                { $regexMatch: { input: "$status", regex: /resolved/i } },
                1,
                0
              ]
            }
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $regexMatch: { input: "$status", regex: /resolved/i } },
                {
                  $divide: [
                    { $subtract: ["$updatedAt", "$createdAt"] },
                    1000 * 60 * 60
                  ]
                },
                null
              ]
            }
          },
          avgTimeSpent: { $avg: "$metadata.timeSpent" }
        }
      },
      {
        $project: {
          _id: 0,
          agentId: "$_id",
          agentName: 1,
          totalAssigned: 1,
          resolvedCount: 1,
          resolutionRate: {
            $cond: [
              { $eq: ["$totalAssigned", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$resolvedCount", "$totalAssigned"] },
                  100
                ]
              }
            ]
          },
          avgResolutionTime: { $round: ["$avgResolutionTime", 2] },
          avgTimeSpent: { $round: ["$avgTimeSpent", 2] }
        }
      },
      { $sort: { resolvedCount: -1 } }
    ]);

    const satisfactionStats = await Ticket.aggregate([
      {
        $match: {
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

    const satisfactionLevels = {
      'Très satisfait': 5,
      'Satisfait': 4,
      'Moyen': 3,
      'Insatisfait': 2,
      'Très insatisfait': 1
    };

    const totalVotes = satisfactionStats.reduce((sum, item) => sum + item.count, 0);
    const weightedSum = satisfactionStats.reduce((sum, item) => {
      return sum + (satisfactionLevels[item._id] || 0) * item.count;
    }, 0);
    const averageSatisfaction = totalVotes > 0 ? (weightedSum / totalVotes).toFixed(2) : null;

    const response = {
      totals: {
        all: totalTickets,
        resolved: resolvedTickets,
        departments: totalDepartments,
        categories: totalCategories,
        users: totalUsers,
        agents: totalAgents,
        clients: totalClients,
        new: newTickets,
        inProgress: inProgressTickets,
        overdue: overdueTickets,
        resolutionRate: totalTickets > 0
          ? parseFloat((resolvedTickets / totalTickets * 100).toFixed(1))
          : 0,
        avgResolutionTime: resolutionStats[0]?.avgResolutionTime?.toFixed(2) || 0,
        avgTimeSpent: timeSpentStats[0]?.avgTimeSpent?.toFixed(2) || 0
      },
      byCategory,
      agentPerformance,
      satisfaction: {
        distribution: satisfactionStats,
        average: averageSatisfaction
      },
      monthlyTrend
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
};

module.exports = { getTicketStats };
