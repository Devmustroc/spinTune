FROM node:20-alpine

# Ajout des dépendances nécessaires pour Prisma
RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

# Copie des fichiers package.json et package-lock.json
COPY package*.json ./

# Installation des dépendances
RUN npm ci

# Copie du reste des fichiers du projet
COPY . .

# Génération du client Prisma
RUN npx prisma generate

# Build de l'application
RUN npm run build

# Exposition du port (à adapter selon le service)
# auth-service: 3001
# playlist-service: 3002
# track-service: 3003
# social-service: 3004
EXPOSE 3001

# Script de démarrage avec migration Prisma
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]