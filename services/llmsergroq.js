const { Groq } = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function askLLM(message, category = "default", provider = "groq") {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: `[${category}] ${message}` }],
      model: "llama3-8b-8192", // ✅ Modèle valide
    });
    return chatCompletion.choices[0].message.content;
  } catch (err) {
    console.error("❌ Erreur Groq :", err.response?.data || err.message);
    return "Réponse indisponible (Groq)";
  }
}

module.exports = { askLLM };
