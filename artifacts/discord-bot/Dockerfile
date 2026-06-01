FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .
RUN npm run build

RUN npm prune --production

RUN mkdir -p data

CMD ["node", "--enable-source-maps", "dist/index.js"]
