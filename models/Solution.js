const mongoose = require('mongoose');

const solutionSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    index: true // Pour des recherches plus rapides
  },
  content: { 
    type: String, 
    required: true 
  },
  keywords: {
    type: [String],
    index: true,
    validate: {
      validator: function(v) {
        return v.length <= 20; // Limite le nombre de keywords
      },
      message: 'Maximum 20 keywords autorisés'
    }
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true 
  },
  isLLMGenerated: { // Nouveau champ
    type: Boolean,
    default: false
  },
  llmMetadata: { // Nouveau champ pour stocker les infos LLM
    model: String,
    prompt: String,
    temperature: Number,
    provider: {
      type: String,
      enum: ['openai', 'huggingface', 'mistral']
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUpdated: { // Nouveau champ
    type: Date,
    default: Date.now
  },
  isFallback: { type: Boolean, default: false },
  fallbackPriority: { type: Number, default: 0 }
});



// Index composé pour les recherches
solutionSchema.index({ category: 1, keywords: 1 });

// Middleware pour mettre à jour lastUpdated
solutionSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Solution', solutionSchema);