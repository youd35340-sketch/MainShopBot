FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN mkdir -p data && \
    [ -f data/db.json ] || echo '{"guilds":{}}' > data/db.json

CMD ["node", "--enable-source-maps", "dist/index.js"]
