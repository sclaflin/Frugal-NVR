# compile website
FROM node:lts-slim

COPY package-lock.json /build/
COPY package.json /build/
COPY .parcelrc /build/
COPY ui /build/ui

WORKDIR /build

RUN npm ci
RUN npm run buildUI

# build final image
FROM node:lts-slim

LABEL description="Frugal NVR is a locally hosted Network Video Recorder with a focus on low CPU usage."
LABEL maintainer "seanclaflin@protonmail.com"

# Install some binaries
RUN apt update \
    && apt upgrade -y \
    && DEBIAN_FRONTEND="noninteractive" \
        apt install -y \
        ffmpeg \
        iputils-ping \
        procps \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /app && chown node:node /app
COPY --chown=node:node lib /app/lib
COPY --chown=node:node migrations /app/migrations
COPY --chown=node:node videos /app/videos
COPY --chown=node:node data /app/data
COPY --chown=node:node package.json /app/
COPY --chown=node:node package-lock.json /app/
COPY --chown=node:node index.js /app/
COPY --chown=node:node --from=0 /build/web /app/web

USER node
WORKDIR /app

RUN npm ci --omit=dev

CMD ["/usr/local/bin/node", "index.js"]