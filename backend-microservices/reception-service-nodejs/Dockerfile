# Dockerfile
# Usa una imagen base de Node.js
FROM node:20-alpine

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos del proyecto
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos
COPY . .

# Expone el puerto (ajusta según cada microservicio)
EXPOSE 3002

# Establece la variable de entorno para Nest.js
ENV NODE_ENV=production

# Ejecuta el build de Nest.js
RUN npm run build

# Comando para ejecutar el servicio
CMD ["npm", "run", "start:prod"]
