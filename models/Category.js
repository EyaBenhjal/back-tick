const mongoose =require ("mongoose");


    const categorySchema = new mongoose.Schema({
        cat_name: {
          type: String,
          required: true,
        },
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
          required: true,
        },
      
        description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
