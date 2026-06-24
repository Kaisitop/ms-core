FROM node:22-alpine

WORKDIR /app

# Instalar dependencias necesarias para Prisma y Postgres
RUN apk add --no-cache openssl netcat-openbsd dos2unix

COPY package*.json ./
RUN npm install

COPY . .

# Copiar el script de entrada y darle permisos (y asegurar fines de linea LF)
COPY docker-entrypoint.sh /usr/local/bin/
RUN dos2unix /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

# Generar el cliente de Prisma (se volverá a correr en el entrypoint por si acaso, pero es buena práctica tenerlo aquí)
RUN npx prisma generate

EXPOSE 3002

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start:dev"]
