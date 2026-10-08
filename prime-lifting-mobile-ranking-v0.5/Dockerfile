# Local development only. Production is Cloudflare Workers.
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8770
CMD ["npm", "run", "dev", "--", "--ip", "0.0.0.0"]
