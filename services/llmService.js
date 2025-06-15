const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

async function getFallbackResponse(category) {
  const responses = {
    technical: "Veuillez redémarrer votre application et réessayer.",
    billing: "Un agent vous contactera sous 24h.",
    default: "Nous traitons votre demande. Merci pour votre patience."
  };
  return responses[category] || responses.default;
}

async function queryWorkingModel(prompt) {
  // Essayez d'abord les modèles fonctionnels
  try {
    const response = await hf.textGeneration({
      model: "google/flan-t5-xxl",
      inputs: prompt,
      parameters: { max_new_tokens: 200 }
    });
    return response.generated_text;
  } catch (error) {
    console.warn("Modèle Flan échoué, tentative Blenderbot...");
    try {
      const response = await hf.conversational({
        model: "facebook/blenderbot-400M-distill",
        inputs: { text: prompt }
      });
      return response.generated_responses[0];
    } catch (err) {
      console.error("Tous les modèles HF ont échoué");
      throw err;
    }
  }
}

async function askLLM(message, category) {
  try {
    return await queryWorkingModel(`[${category}] ${message}`);
  } catch (error) {
    console.error("Fallback local activé");
    return await getFallbackResponse(category);
  }
}