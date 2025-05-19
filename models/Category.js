const mongoose = require('mongoose');
const Solution = require('./Solution');

const categorySchema = new mongoose.Schema({
  cat_name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department', 
   required: false
  },
  description: String,
 keywords: [String],
  defaultResponse: String,
  solutions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Solution'
  }]
}, { timestamps: true });

categorySchema.methods.getChatbotResponse = async function(message = "") {
  const solutions = await this.model('Solution').find({ category: this._id });
  const tokens = message.toLowerCase().split(/\s+/);
  
  let bestSolution = null;
  let maxScore = 0;

  solutions.forEach(solution => {
    const score = solution.keywords.filter(kw => 
      tokens.some(token => token.includes(kw.toLowerCase()))
    ).length;
    
    if (score > maxScore) {
      maxScore = score;
      bestSolution = solution;
    }
  });

  return {
    reply: bestSolution?.content || this.defaultResponse,
    matchedKeywords: bestSolution?.keywords || [],
    category: this.cat_name
  };
};
// Export final
module.exports = mongoose.model('Category', categorySchema);