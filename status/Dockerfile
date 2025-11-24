FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production
COPY src ./src
EXPOSE 4300
CMD ["node", "src/server.js"]
