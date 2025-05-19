import Ticket from "../models/Ticket"; // Modèle Mongoose des tickets
import User from "../models/User";
import Department from "../models/Department";
import Category from "../models/Category";
// Statistiques globales (totaux, résolus, temps moyen)
export const getTicketStats = async (req, res) => {
  try {
    // 1. Total des tickets
    const totalTickets = await Ticket.countDocuments();

    // 2. Tickets résolus
    const resolvedTickets = await Ticket.countDocuments({ status: "resolved" });

    // 3. Temps moyen de résolution (exemple avec un champ `resolutionTime` en heures)
    const avgResolution = await Ticket.aggregate([
      { $match: { status: "resolved" } },
      { $group: { _id: null, avg: { $avg: "$resolutionTime" } } }
    ]);

    // 4. Répartition par catégorie (si vous avez un champ `category`)
    const byCategory = await Ticket.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json({
      total: totalTickets,
      resolved: resolvedTickets,
      resolutionRate: (resolvedTickets / totalTickets * 100).toFixed(1) + "%",
      avgResolutionTime: avgResolution[0]?.avg?.toFixed(1) || 0 + "h",
      byCategory: byCategory.map(item => ({ name: item._id, value: item.count }))
    });

  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Évolution mensuelle (nouveaux/résolus)
export const getMonthlyTrends = async (req, res) => {
  try {
    const trends = await Ticket.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          created: { $sum: 1 },
          resolved: { 
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } 
          }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Formatage pour le frontend (ex: [{ name: "Jan", created: 10, resolved: 6 }])
    const formatted = trends.map(t => ({
      name: new Date(0, t._id - 1).toLocaleString('fr-FR', { month: 'short' }),
      created: t.created,
      resolved: t.resolved
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const getGlobalStats = async (req, res) => {
  try {
    // 1. Comptage des utilisateurs par rôle
    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    // 2. Total départements et catégories
    const [totalDepartments, totalCategories] = await Promise.all([
      Department.countDocuments(),
      Category.countDocuments()
    ]);

    // 3. Catégories par département
    const categoriesByDepartment = await Category.aggregate([
      {
        $lookup: {
          from: "departments",
          localField: "department",
          foreignField: "_id",
          as: "dept"
        }
      },
      { $unwind: "$dept" },
      { $group: { _id: "$dept.dep_name", count: { $sum: 1 } } }
    ]);

    res.json({
      users: {
        total: await User.countDocuments(),
        byRole: usersByRole.map(item => ({ role: item._id, count: item.count }))
      },
      departments: {
        total: totalDepartments,
        categories: categoriesByDepartment
      },
      categories: {
        total: totalCategories
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};