FROM node:24-alpine

LABEL org.opencontainers.image.title="番星ai题库"
LABEL org.opencontainers.image.description="OCS AI 题库服务，支持 Node、Docker、EdgeOne 与 Cloudflare Workers"
LABEL org.opencontainers.image.version="1.3.0"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.authors="fanxing724"
LABEL org.opencontainers.image.source="https://cnb.cool/rice-King/ocs-ai-qbank"

WORKDIR /app
COPY server.js answer-utils.js homepage.html package.json LICENSE NOTICE ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
