FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --only=production

COPY src ./src

ENV NODE_ENV=production \
    EXPLORER_PORT=4200 \
    BULENNODE_API_BASE=http://bulennode:4100/api

EXPOSE 4200

CMD ["node", "src/server.js"]

