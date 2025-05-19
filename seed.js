const mongoose = require('mongoose');
const Category = require('./models/Category');
const Solution = require('./models/Solution');
require('dotenv').config();

mongoose.set('strictQuery', false);

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('🔌 Connecté à MongoDB');

    // Nettoyage des collections
    await Category.deleteMany({});
    await Solution.deleteMany({});

    // Création des catégories
    const electricite = await Category.create({
      cat_name: "Electricité",
      keywords: ["disjoncteur", "fusible", "courant", "panne", "sauter"],
      defaultResponse: "Solution par défaut pour problèmes électriques"
    });

    const informatique = await Category.create({
      cat_name: "Informatique",
      keywords: ["ordinateur", "logiciel", "internet", "wifi", "imprimante"],
      defaultResponse: "Solution par défaut pour problèmes informatiques"
    });
    

    // Création des solutions
    const solutionElectrique = await Solution.create({
      title: "Disjoncteur saute",
      content: "1. Identifier l'appareil en cause\n2. Réduire la charge électrique\n3. Réarmer le disjoncteur",
      keywords: ["disjoncteur", "sauter", "électricité"],
      category: electricite._id
    });

    const solutionInformatique = await Solution.create({
      title: "Problème WiFi",
      content: "1. Redémarrer la box\n2. Vérifier les câbles\n3. Réinitialiser les paramètres réseau",
      keywords: ["wifi", "internet", "connexion"],
      category: informatique._id
    });

    // Lier les solutions aux catégories
    await Category.findByIdAndUpdate(electricite._id, {
      $push: { solutions: solutionElectrique._id }
    });

    await Category.findByIdAndUpdate(informatique._id, {
      $push: { solutions: solutionInformatique._id }
    });

    console.log('✅ Base de données initialisée avec succès');
    console.log(`- Catégories créées: ${electricite.cat_name}, ${informatique.cat_name}`);
    console.log(`- Solutions créées: ${solutionElectrique.title}, ${solutionInformatique.title}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedDatabase();