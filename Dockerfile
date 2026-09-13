FROM ghcr.io/puppeteer/puppeteer:22.13.1

WORKDIR /app

# Reutilise le Chromium deja installe dans cette image officielle
# au lieu d'en re-telecharger un et d'installer des libs systeme a la main
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

USER root
COPY package*.json ./
RUN npm install
COPY . .
RUN chown -R pptruser:pptruser /app
USER pptruser

EXPOSE 3001

CMD ["node", "server.js"]
