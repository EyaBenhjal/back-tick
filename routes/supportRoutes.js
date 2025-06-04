// const express = require('express');
// const router = express.Router();

// const NLPService = require('../services/nlpService');
// const Solution = require('../models/Solution');
// const Ticket = require('../models/Ticket');
// const { detectCategory } = require('../controllers/categoryController');
// const chatbotController = require('../controllers/chatbotController');
// const { verifyAccessToken } = require("../middlewares/authMiddleware");

// const natural = require('natural');
// const tokenizer = new natural.WordTokenizer();

// router.post('/detect-category', verifyAccessToken, detectCategory);

// router.post('/analyze', verifyAccessToken, async (req, res) => {
//   try {
//     const { text } = req.body;

//     if (!text) {
//       return res.status(400).json({ error: "Le texte est requis" });
//     }

//     const category = await NLPService.detectCategoryFromText(text);

//     if (!category) {
//       return res.status(404).json({ error: "Aucune catégorie pertinente trouvée" });
//     }

//     const tokens = tokenizer.tokenize(text.toLowerCase());
//     const solutions = await NLPService.getCategorySolutions(category._id, tokens);

//     res.json({
//       category,
//       solutions,
//       suggestedCategory: category.cat_name
//     });
//   } catch (error) {
//     console.error("Erreur analyse:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;
