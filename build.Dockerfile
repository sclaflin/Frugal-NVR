# build final image
FROM node:lts-slim

LABEL description="Frugal NVR is a locally hosted Network Video Recorder with a focus on low CPU usage."
LABEL maintainer "seanclaflin@protonmail.com"

# Install some binaries
RUN apt update \
    && apt upgrade -y \
    && DEBIAN_FRONTEND="noninteractive" \
        apt install -y \
        python3 \
        python-is-python3 \
        build-essential \
        ffmpeg \
        iputils-ping \
        procps \
        mediainfo \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /app && chown node:node /app
COPY --chown=node:node lib /app/lib
COPY --chown=node:node ui /app/ui
COPY --chown=node:node migrations /app/migrations
COPY --chown=node:node videos /app/videos
COPY --chown=node:node data /app/data
COPY --chown=node:node package.json /app/
COPY --chown=node:node package-lock.json /app/
COPY --chown=node:node index.js /app/

USER node
WORKDIR /app

RUN npm ci
RUN npm run buildUI

CMD ["/usr/local/bin/node", "index.js"]
