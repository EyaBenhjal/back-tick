const mongoose = require('mongoose');
require('dotenv').config();
const Category = require('../models/Category');
const Solution = require('../models/Solution');
const predefinedData = require('../data/predefinedData');

mongoose.set('strictQuery', false);

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('🔌 Connecté à MongoDB');

    await Category.deleteMany({});
    await Solution.deleteMany({});

    for (const [catName, solutions] of Object.entries(predefinedData)) {
      const cat = await Category.create({
        cat_name: catName,
        keywords: solutions.flatMap(s => s.keywords),
        defaultResponse: `Aucune solution spécifique trouvée pour ${catName}.`,
      });

      for (const sol of solutions) {
        const solution = await Solution.create({
          ...sol,
          category: cat._id
        });

        cat.solutions.push(solution._id);
      }

      await cat.save();
    }

    console.log('✅ Base de données initialisée avec succès');
  } catch (err) {
    console.error('❌ Erreur lors de l\'initialisation :', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedDatabase();
