FROM node:22-bookworm
# ARM64-native build (no QEMU emulation needed on M-series Mac)
# Use apt chromium which has arm64 support

# Install Chromium system deps + Xvfb + ffmpeg + xterm + fluxbox + xdotool + system chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb x11-utils ffmpeg xterm fluxbox xdotool \
    chromium \
    libasound2 libatk1.0-0 libatk-bridge2.0-0 libcairo2 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 \
    libnss3 libpango-1.0-0 libpangocairo-1.0-0 libx11-6 libxcb1 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxkbcommon0 \
    libxrandr2 libxshmfence1 libxss1 libxtst6 \
    fonts-liberation fonts-noto-cjk \
    wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install playwright-cli-multi-tab
COPY package.json package-lock.json ./
RUN npm ci

# Download Chromium
RUN npx playwright install chromium

# Patch playwright-core exports (npm-published alpha missing cli-client/cli export)
COPY patch-exports.js ./
RUN node patch-exports.js

# Link CLI globally
COPY playwright-cli.js ./
RUN npm link

# ── Extension setup ─────────────────────────────────────────────────────────
# Copy pre-built extension dist
COPY extension-dist /ext/dist

# Patch manifest with public key so extension ID is mmlmfjhmonkocbjadbfplnigmagldckm
COPY setup-extension.js ./
RUN EXT_DIR=/ext/dist node setup-extension.js
# Note: extension-dist/lib/ui/authToken.js is already patched on host
# to return fixed token DEMO_FIXED_TOKEN_FOR_RECORDING

# Wrapper: launches apt Chromium (arm64 native) with the extension always loaded
RUN printf '#!/bin/bash\nexec /usr/bin/chromium --load-extension=/ext/dist --disable-extensions-except=/ext/dist --no-first-run --no-default-browser-check --no-sandbox --disable-setuid-sandbox --window-position=640,0 --window-size=640,800 "$@"\n' \
    > /usr/local/bin/chromium-demo && \
    chmod +x /usr/local/bin/chromium-demo

# ── Demo workspace ───────────────────────────────────────────────────────────
WORKDIR /demo

# Config: tell playwright-cli to use our wrapper executable
# Also set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH as env fallback
RUN mkdir -p .playwright && printf '{\n  "browser": {\n    "browserName": "chromium",\n    "launchOptions": {\n      "executablePath": "/usr/local/bin/chromium-demo",\n      "headless": false\n    }\n  }\n}\n' \
    > .playwright/cli.config.json

ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/local/bin/chromium-demo

COPY demo.sh record.sh ./
RUN chmod +x demo.sh record.sh

CMD ["/demo/record.sh"]
