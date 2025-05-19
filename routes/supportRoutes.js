// back_ticket/routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const NLPService = require('../services/nlpService');
const Solution = require('../models/Solution');
const Ticket = require('../models/Ticket');

router.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    
    // Détection de la catégorie
    const category = await NLPService.detectCategoryFromText(text);
    const tokens = tokenizer.tokenize(text.toLowerCase());
    
    // Recherche de solutions
    const solutions = await NLPService.getCategorySolutions(category._id, tokens);
    
    res.json({ 
      category,
      solutions,
      suggestedCategory: category.cat_name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});