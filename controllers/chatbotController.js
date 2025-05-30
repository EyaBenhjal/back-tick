const Category = require('../models/Category');
const Solution = require('../models/Solution');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const NLPService = require('../services/nlpService');

const predefinedData = require('../data/predefinedData');
const handleAutoChatbot = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Le champ 'message' est requis",
        error: true
      });
    }

    // Détection automatique de la catégorie
    const categories = await Category.find();
    const words = message.toLowerCase().split(/\W+/);
    
    let bestCategory = null;
    let maxMatches = 0;

    for (const cat of categories) {
      const keywords = cat.keywords.map(k => k.toLowerCase());
      const matches = words.filter(word => keywords.includes(word)).length;
      
      if (matches > maxMatches) {
        bestCategory = cat;
        maxMatches = matches;
      }
    }

    if (!bestCategory) {
      return res.json({
        reply: "Je n'ai pas pu identifier votre problème. Pouvez-vous fournir plus de détails ?",
        error: false,
        category: null
      });
    }

    // Recherche des solutions
    const solutions = await Solution.find({ category: bestCategory._id });
    const { reply, matchedKeywords } = await NLPService.findBestResponse(message, solutions);

    res.json({
      reply,
      category: bestCategory.cat_name,
      matchedKeywords,
      error: false
    });

  } catch (error) {
    console.error('Erreur chatbot:', error);
    res.status(500).json({ 
      reply: "Désolé, une erreur technique est survenue",
      error: true 
    });
  }
};



const detectCategory = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success: false, message: "Le texte est requis" });

  // On récupère toutes les catégories
  const categories = await Category.find();

  // Transforme texte en mots simples, en minuscules
  const words = text.toLowerCase().split(/\W+/);

  // Recherche la catégorie qui a le plus de mots clés correspondants
  let bestCat = null;
  let maxMatches = 0;

  for (const cat of categories) {
    const keywords = cat.keywords.map(k => k.toLowerCase());
    const matches = words.filter(word => keywords.includes(word)).length;

    if (matches > maxMatches) {
      bestCat = cat;
      maxMatches = matches;
    }
  }

  if (!bestCat) {
    return res.status(404).json({ success: false, message: "Aucune catégorie trouvée" });
  }

  res.json({
    success: true,
    category: bestCat.cat_name,
    description: bestCat.defaultResponse || null
  });
};

module.exports = { detectCategory };



const handleCategoryChatbot = async (req, res) => {
  try {
    const { category, message } = req.body;

    if (!category || !message) {
      return res.status(400).json({
        reply: "Les champs 'category' et 'message' sont requis",
        error: true
      });
    }

    const { reply, matchedKeywords, category: detectedCategory } = 
      await NLPService.getResponseByCategory(category, message);

    res.json({
      reply,
      category: detectedCategory || category,
      matchedKeywords,
      error: false
    });

  } catch (error) {
    console.error('Erreur chatbot:', error);
    res.status(500).json({ 
      reply: "Désolé, une erreur technique est survenue",
      error: true 
    });
  }
};

module.exports = { detectCategory, handleCategoryChatbot,handleAutoChatbot };
