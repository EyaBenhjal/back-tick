// controllers/availabilityController.js
const Disponibility = require("../models/Availability");
const User = require("../models/User");

exports.createOrUpdateAvailability = async (req, res) => {
    try {
 const { slots = [], status, currentTickets, maxTickets } = req.body; // slots rendu optionnel
        const userId = req.user.id;

        // Validation des créneaux seulement si slots est fourni
        if (slots && !Array.isArray(slots)) {
            return res.status(400).json({
                success: false,
                error: "Les disponibilités doivent être un tableau"
            });
        }
        // Validation des créneaux
        if (!Array.isArray(slots)) {
            return res.status(400).json({
                success: false,
                error: "Les disponibilités doivent être un tableau"
            });
        }

        for (const slot of slots) {
            if (!slot.day || !slot.start || !slot.end) {
                return res.status(400).json({
                    success: false,
                    error: "Chaque créneau doit avoir un jour, une heure de début et de fin"
                });
            }

            // Validation du format des heures
            if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(slot.start) || 
                !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(slot.end)) {
                return res.status(400).json({
                    success: false,
                    error: "Format d'heure invalide. Utilisez HH:MM"
                });
            }
        }

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Utilisateur non trouvé"
            });
        }

        let disponibility;
   if (user.availability) {
    // Mise à jour
    disponibility = await Disponibility.findByIdAndUpdate(
        user.availability,
        { slots, status, currentTickets, maxTickets },
        { new: true }
    );
} else {
    // Création
    disponibility = new Disponibility({
        user: userId,
        slots,
        status,
        currentTickets,
        maxTickets
    });
    await disponibility.save();
    user.availability = disponibility._id;
    await user.save();
}


        res.json({
            success: true,
            disponibility
        });

    } catch (err) {
        console.error("Erreur createOrUpdateAvailability:", err);
        res.status(500).json({ 
            success: false, 
            error: "Erreur serveur" 
        });
    }
};
exports.updateStatusAndWorkload = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, currentTickets, maxTickets } = req.body;

        // Validation minimale
        if (!status || !maxTickets) {
            return res.status(400).json({
                success: false,
                error: "Statut et capacité maximale sont requis"
            });
        }

        const user = await User.findById(userId);
        if (!user || !user.availability) {
            return res.status(404).json({ 
                success: false, 
                error: "Disponibilité non trouvée" 
            });
        }

        // Mise à jour sans toucher aux slots existants
        const updated = await Disponibility.findByIdAndUpdate(
            user.availability,
            { 
                status,
                currentTickets: currentTickets || 0, // Valeur par défaut
                maxTickets 
            },
            { new: true }
        );

        res.json({ 
            success: true, 
            disponibility: updated 
        });

    } catch (err) {
        console.error("Erreur updateStatusAndWorkload:", err);
        res.status(500).json({ 
            success: false, 
            error: "Erreur serveur" 
        });
    }
};

exports.getUserAvailability = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).populate('availability');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Utilisateur non trouvé"
            });
        }

        if (!user.availability) {
            return res.json({
                success: true,
                disponibility: { slots: [] }
            });
        }

        res.json({
            success: true,
            disponibility: user.availability
        });

    } catch (err) {
        console.error("Erreur getUserAvailability:", err);
        res.status(500).json({ 
            success: false, 
            error: "Erreur serveur" 
        });
    }
};

exports.addAvailabilitySlot = async (req, res) => {
    try {
        const { day, start, end } = req.body;
        const userId = req.user.id;

        // Validation
        if (!day || !start || !end) {
            return res.status(400).json({
                success: false,
                error: "Jour, heure de début et heure de fin sont requis"
            });
        }

        const user = await User.findById(userId).populate('availability');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Utilisateur non trouvé"
            });
        }

        let disponibility;
        if (!user.availability) {
            // Créer une nouvelle disponibilité si elle n'existe pas
            disponibility = new Disponibility({
                user: userId,
                slots: [{ day, start, end }]
            });
            await disponibility.save();
            user.availability = disponibility._id;
            await user.save();
        } else {
            // Vérifier si le créneau existe déjà
            const slotExists = user.availability.slots.some(
                slot => slot.day === day && slot.start === start && slot.end === end
            );

            if (slotExists) {
                return res.status(400).json({
                    success: false,
                    error: "Ce créneau existe déjà"
                });
            }

            // Ajouter le nouveau créneau
            disponibility = await Disponibility.findByIdAndUpdate(
                user.availability._id,
                { $push: { slots: { day, start, end } } },
                { new: true }
            );
        }

        res.json({
            success: true,
            disponibility
        });

    } catch (err) {
        console.error("Erreur addAvailabilitySlot:", err);
        res.status(500).json({ 
            success: false, 
            error: "Erreur serveur" 
        });
    }
};

exports.removeAvailabilitySlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user || !user.availability) {
            return res.status(404).json({
                success: false,
                error: "Disponibilités non trouvées"
            });
        }

        const disponibility = await Disponibility.findByIdAndUpdate(
            user.availability,
            { $pull: { slots: { _id: slotId } } },
            { new: true }
        );

        res.json({
            success: true,
            disponibility
        });

    } catch (err) {
        console.error("Erreur removeAvailabilitySlot:", err);
        res.status(500).json({ 
            success: false, 
            error: "Erreur serveur" 
        });
    }
};