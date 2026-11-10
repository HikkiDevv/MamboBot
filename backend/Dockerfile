FROM node:22-bookworm-slim

WORKDIR /app

# Instalar dependencias
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "src/server.js"]
