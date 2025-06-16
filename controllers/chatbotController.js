const Category = require('../models/Category');
const Solution = require('../models/Solution');
const NLPService = require('../services/nlpService');
const { askLLM } = require('../services/llmsergroq');

const ChatMessage = require('../models/chatMessage');


const getChatbotResponse = async (req, res) => {
  const { message, category, provider = "openai", userId, ticketId } = req.body;

  try {
    // 1. Stocker la question utilisateur
    const userMessage = new ChatMessage({
      from: 'user',
      content: message,
      userId,
      ticketId,
    });
    await userMessage.save();

    // 2. Obtenir la réponse du LLM
    const response = await askLLM(message, category, provider);

    // 3. Stocker la réponse du bot
    const botMessage = new ChatMessage({
      from: 'bot',
      content: response,
      userId,
      ticketId,
    });
    await botMessage.save();

    // 4. Répondre à la requête HTTP
    res.json({
      success: true,
      response,
      provider_used: provider
    });
  } catch (error) {
    console.error("Erreur LLM:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback_response: "Désolé, notre système rencontre des difficultés. Veuillez réessayer plus tard."
    });
  }
};

async function getBestFallback(categoryId) {
  return await Solution.findOne(
    { category: categoryId, isFallback: true },
    {},
    { sort: { fallbackPriority: -1 } }
  );
}
// 📌 2. DETECT CATEGORY (utilisé seul)
const detectCategory = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: "Le texte est requis" });
  }

  const categories = await Category.find();
  const words = text.toLowerCase().split(/\W+/);

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

// 📌 3. AUTO CHATBOT (catégorie détectée automatiquement)
const handleAutoChatbot = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        reply: "Le champ 'message' est requis",
        error: true
      });
    }

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

    const solutions = await Solution.find({ category: bestCategory._id });
    const { reply, matchedKeywords } = await NLPService.findBestResponse(message, solutions);

    let finalReply = reply;

    if (!reply || reply.includes("Je n'ai pas") || matchedKeywords.length === 0) {
      finalReply = await getLLMResponse(message, bestCategory.cat_name, reply);
    }

    res.json({
      reply: finalReply,
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

module.exports = {
  getChatbotResponse,
  detectCategory,
  handleAutoChatbot,
  handleCategoryChatbot
};
