# Choisir l image de base
FROM node:18-alpine
# definir le repertoire de travail 
WORKDIR /app 
# coupier les fichier  necessaire 
# on commence par les depandance pour le caching
COPY package*.json ./
#on copie tout le reste dans notre repertoire de travaile 
COPY . .
#installer les dependances 
#ici on vas inctaller seulement les dependance important 
RUN npm install
#Onvas exposer le port 
EXPOSE 8001 
#et finalement on vas executer les commendes permettant d executer le service dans le conteneur 
CMD ["npm","run","dev"]



