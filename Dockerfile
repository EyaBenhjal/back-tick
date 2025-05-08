# Utilise une image officielle de Node.js
FROM node:20

# Crée le répertoire de l'app dans le conteneur
WORKDIR /app

# Copie les fichiers de package et installe les dépendances
COPY package*.json ./
RUN npm install

# Copie le reste des fichiers de l'app
COPY . .

# L'app écoute sur ce port
EXPOSE 5000

# Commande pour lancer ton backend
CMD ["node", "app.js"]
