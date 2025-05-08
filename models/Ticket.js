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
      default: 0,
      min: 0
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





module.exports = mongoose.model("Ticket", ticketSchema);