
const express = require("express");
const router = express.Router();
const { detectCategory, handleCategoryChatbot,handleAutoChatbot,getChatbotResponse } = require('../controllers/chatbotController');
const { verifyAccessToken } = require("../middlewares/authMiddleware");

router.post("/detect-category", verifyAccessToken, detectCategory);
router.post("/chatbot-response", verifyAccessToken, handleCategoryChatbot);

router.post("/auto-chatbot", verifyAccessToken, handleAutoChatbot);
router.post('/llm', verifyAccessToken, getChatbotResponse); 

module.exports = router;