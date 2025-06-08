const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Le titre est obligatoire"],
    trim: true,
    maxlength: [100, "Le titre ne peut dépasser 100 caractères"]
  },
  description: {
    type: String,
    required: [true, "La description est obligatoire"],
    minlength: [6, "La description doit contenir au moins 6 caractères"]
  },
comments: [{
  text: {
    type: String,
    required: [true, "Le commentaire ne peut pas être vide"],
    trim: true,
    maxlength: [1000, "Le commentaire ne peut dépasser 1000 caractères"]
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  deleted: { type: Boolean, default: false }, // ✅ Soft delete flag
  deletedAt: { type: Date } 
}],
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium"
  },
  status: {
    type: String,
    enum: ["new", "in_progress", "resolved", "closed"], // Ajout de "closed"
    default: "new"
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: async function(v) {
        if (!v) return true;
        const user = await mongoose.model('User').findById(v);
        return user?.role === "Agent";
      },
      message: "Doit être un Agent valide"
    }
  },
  clientDetails: {
    name: {
      type: String,
      trim: true,
      required: [true, "Le nom du client est obligatoire"]
    },
    email: {
      type: String,
      trim: true,
      required: [true, "L'email du client est obligatoire"],
      match: [/.+\@.+\..+/, 'Veuillez entrer un email valide']
    }
  },
  satisfaction: { 
  type: String,
  enum: ['Très satisfait', 'Satisfait', 'Moyen', 'Insatisfait', 'Très insatisfait'],
  default: 'Moyen'
},

  metadata: {
    requestType: {
      type: String,
      enum: ["Incident", "Demande", "Problème"],
      default: "Incident"
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "La catégorie est obligatoire"]
    },
    
    dueDate: Date,
    timeSpent: {
      type: Number,
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdByRole: {
    type: String,
    enum: ["Client", "Agent", "Admin"],
    required: true
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || this.startDate <= v;
      },
      message: "La date de fin doit être après la date de début"
    }
  },
  resolutionNotes: String,
  history: [{
    action: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  files: [{
    path: {
      type: String,
      required: [true, "Le chemin du fichier est obligatoire"]
    },
    originalName: {
      type: String,
      required: [true, "Le nom original du fichier est obligatoire"]
    },

chatHistory: [{
  from: { type: String, enum: ['user', 'bot'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}],
keywords: [String],
sentiment: String
,
    fileType: {
      type: String,
      required: [true, "Le type de fichier est obligatoire"]
    },
    uploadedAt: { 
      type: Date, 
      default: Date.now 
    }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});
// Dans models/Ticket.js
ticketSchema.statics.createFromChatbot = async function(chatData) {
  const { userId, message, files = [], category } = chatData;
  
  // Trouver le département par défaut pour cette catégorie
  const defaultDept = await mongoose.model('Department').findOne({ 
    categories: category 
  });

  return this.create({
    title: `Demande chatbot: ${message.substring(0, 50)}`,
    description: message,
    department: defaultDept?._id,
    requester: userId,
    clientDetails: {
      name: chatData.userName,
      email: chatData.userEmail
    },
    metadata: {
      category: category,
      requestType: "Demande" // Ou déterminé dynamiquement
    },
    files: files.map(file => ({
      path: file.url,
      originalName: file.originalname,
      fileType: file.mimetype
    })),
    chatHistory: [{
      from: 'user',
      content: message,
      timestamp: new Date()
    }]
  });
  
};

ticketSchema.methods.addChatResponse = function(response) {
  this.chatHistory.push({
    from: 'bot',
    content: response,
    timestamp: new Date()
  });
  return this.save();
};
module.exports = mongoose.model("Ticket", ticketSchema);