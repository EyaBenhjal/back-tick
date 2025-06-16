const { HfInference } = require('@huggingface/inference');
const OpenAI = require("openai");

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getFallbackResponse(category) {
  console.warn(`⚠️ Activation fallback pour catégorie "${category}"`);
  const responses = {
    technical: "Veuillez redémarrer votre application et réessayer.",
    billing: "Un agent vous contactera sous 24h.",
    default: "Nous traitons votre demande. Merci pour votre patience."
  };
  return responses[category] || responses.default;
}

async function queryWorkingModel(prompt) {
  console.log("🔹 Prompt envoyé :", prompt);

  // 1️⃣ Hugging Face - modèle compatible textGeneration
  try {
    const response = await hf.textGeneration({
      model: "tiiuae/falcon-7b-instruct", // ou un autre modèle compatible HF
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.7
      }
    });
    console.log("✅ Réponse Hugging Face :", response.generated_text);
    return response.generated_text;
  } catch (error) {
    console.warn("⚠️ Échec Hugging Face :", error.message);
  }

  // 2️⃣ OpenAI - GPT-3.5
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });
    const reply = response.choices[0].message.content;
    console.log("✅ Réponse OpenAI :", reply);
    return reply;
  } catch (error) {
    console.error("❌ Échec OpenAI :", error.response?.data || error.message);
    throw error;
  }
}

