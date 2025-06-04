const natural = require('natural');
const { WordTokenizer, PorterStemmerFr } = natural;
const tokenizer = new WordTokenizer();
const Category = require('../models/Category');
const Solution = require('../models/Solution');

class NLPService {
  /**
   * Trouve la meilleure réponse pour une catégorie et un message
   * @param {string} categoryName 
   * @param {string} message 
   * @returns {Promise<{reply: string, matchedKeywords: string[]}>}
   */
  static async getResponseByCategory(categoryName, message) {
    try {
      const category = await Category.findOne({ 
        cat_name: new RegExp(categoryName, 'i') 
      }).populate('solutions');
      
      if (!category) {
        return {
          reply: `Je n'ai pas d'information pour "${categoryName}"`,
          matchedKeywords: []
        };
      }

      // Tokenization et stemming pour le français
      const tokens = PorterStemmerFr.tokenizeAndStem(message.toLowerCase());
      
      let bestSolution = null;
      let maxScore = 0;

      category.solutions.forEach(solution => {
        const solutionKeywords = solution.keywords.map(kw => 
          PorterStemmerFr.stem(kw.toLowerCase())
        );
        
        const score = solutionKeywords.filter(kw => 
          tokens.includes(kw)
        ).length;
        
        if (score > maxScore) {
          maxScore = score;
          bestSolution = solution;
        }
      });

      return {
        reply: bestSolution?.content || category.defaultResponse,
        matchedKeywords: bestSolution?.keywords || [],
        category: category.cat_name
      };
      
    } catch (error) {
      console.error("Erreur NLP:", error);
      return {
        reply: "Désolé, je rencontre un problème technique.",
        matchedKeywords: [],
        category: null
      };
    }
  }
}
const findBestResponse = async (message, solutions) => {
  // Tokenization et stemming du message
  const messageTokens = natural.PorterStemmerFr.tokenizeAndStem(message.toLowerCase());
  
  let bestSolution = null;
  let maxScore = 0;
  let matchedKeywords = [];

  for (const solution of solutions) {
    const solutionKeywords = solution.keywords.map(k => 
      natural.PorterStemmerFr.stem(k.toLowerCase())
    );
    
    const intersection = messageTokens.filter(token => 
      solutionKeywords.includes(token)
    );
    
    if (intersection.length > maxScore) {
      maxScore = intersection.length;
      bestSolution = solution;
      matchedKeywords = [...new Set(intersection)]; // Éviter les doublons
    }
  }

  return {
    reply: bestSolution?.content || "Je n'ai pas trouvé de solution spécifique à votre problème.",
    matchedKeywords
  };
};
module.exports = {
  NLPService,
  findBestResponse
};