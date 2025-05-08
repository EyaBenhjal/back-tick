const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function updateImagePaths() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB...');

    // Trouver les utilisateurs avec des chemins sans extension
    const users = await User.find({
      profileImage: { 
        $regex: /^\/uploads\/[^\.]+$/,
        $exists: true 
      }
    });

    console.log(`Found ${users.length} users to update`);

    // Mise à jour des chemins
    let updatedCount = 0;
    for (const user of users) {
      if (user.profileImage && !user.profileImage.includes('.')) {
        user.profileImage += '.jpg';
        await user.save();
        updatedCount++;
        console.log(`Updated: ${user._id} - ${user.profileImage}`);
      }
    }

    console.log(`\nUpdate complete! ${updatedCount} users updated`);
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateImagePaths();