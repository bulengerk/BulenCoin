FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --only=production

COPY src ./src

ENV NODE_ENV=production \
    BULEN_NODE_PROFILE=server-full \
    BULEN_REQUIRE_SIGNATURES=true \
    BULEN_ENABLE_FAUCET=false

EXPOSE 4100

CMD ["node", "src/index.js"]

