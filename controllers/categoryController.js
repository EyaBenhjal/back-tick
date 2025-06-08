const Category = require("../models/Category");
const mongoose = require("mongoose");

const getCategoryForChatbot = async (req, res) => {
  try {
    const { categoryName } = req.params;
    
    if (!categoryName) {
      return res.status(400).json({ 
        success: false, 
        error: "Le nom de la catégorie est requis" 
      });
    }

    const category = await Category.findOne({ 
      cat_name: new RegExp(categoryName, 'i') 
    });

    if (!category) {
      return res.status(404).json({ 
        success: false, 
        error: "Catégorie non trouvée" 
      });
    }

    const response = await category.getChatbotResponse();
    
    return res.status(200).json({ 
      success: true, 
      category: category.cat_name,
      reply: response 
    });

  } catch (error) {
    console.error("❌ Erreur getCategoryForChatbot:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Erreur serveur" 
    });
  }
};
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate("department");
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("❌ Erreur getCategories:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des catégories" });
  }
};

const addCategory = async (req, res) => {
  try {
    const { cat_name, description, department } = req.body;
    const newCat = new Category({ cat_name, description, department });

    const existing = await Category.findOne({ cat_name });
if (existing) {
  return res.status(400).json({ success: false, error: "Cette catégorie existe déjà." });
}

    await newCat.save();
    return res.status(200).json({ success: true, category: newCat });
  } catch (error) {
    console.error("❌ Erreur addCategory:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de l'ajout de la catégorie" });
  }
};

const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id).populate("department");
    if (!category) {
      return res.status(404).json({ success: false, error: "Catégorie non trouvée" });
    }
    return res.status(200).json({ success: true, category });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { cat_name, description, department } = req.body;

    const updated = await Category.findByIdAndUpdate(
      id,
      { cat_name, description, department },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: "Catégorie non trouvée" });
    }

    return res.status(200).json({ success: true, category: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la mise à jour" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Catégorie non trouvée" });
    }
    return res.status(200).json({ success: true, deleted });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la suppression" });
  }
};

const getCategoriesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ 
        success: false, 
        error: "ID de département invalide" 
      });
    }

    const categories = await Category.find({ department: departmentId })
      .populate('department', 'name _id'); // Peupler les infos de base du département

    res.status(200).json({ 
      success: true, 
      data: categories,
      count: categories.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: "Erreur serveur",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
module.exports = { 
  getCategories, 
  addCategory, 
  getCategory, 
  updateCategory, 
  deleteCategory,
  getCategoriesByDepartment ,
  getCategoryForChatbot
};