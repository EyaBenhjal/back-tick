const Category = require('../models/Category');
const Solution = require('../models/Solution');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const NLPService = require('../services/nlpService');

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

module.exports = { handleCategoryChatbot };