// back_ticket/api/openai.js
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  const { message, category } = req.body;

  try {
    // Exemple : utilisez OpenAI (remplacez avec votre clé et modèle si nécessaire)
    const openaiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant pour les questions dans la catégorie : ${category}`,
          },
          {
            role: "user",
            content: message,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = openaiResponse.data.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Erreur avec l'API OpenAI:", error?.response?.data || error.message);
    res.status(500).json({ error: "Erreur lors de l’appel à l’API OpenAI." });
  }
});

module.exports = router;
