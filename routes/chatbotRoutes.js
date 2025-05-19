const express = require("express");
const router = express.Router();
const { handleCategoryChatbot } = require("../controllers/chatbotController"); // Assurez-vous que ce chemin est correct

console.log(handleCategoryChatbot); 

router.post("/by-category", handleCategoryChatbot);

module.exports = router;