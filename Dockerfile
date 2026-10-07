FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node . /app
USER node
ENV HOST=0.0.0.0 PORT=8080 PRIME_DB=/data/ranking.sqlite
EXPOSE 8080
CMD ["node", "server/start.mjs"]
