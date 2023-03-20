FROM node:lts-slim

ENV SHELL /bin/bash

# Install some binaries
RUN apt update \
    && apt upgrade -y \
    && DEBIAN_FRONTEND="noninteractive" \
        apt install -y \
        sudo \
        iputils-ping \
        procps \
        git \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Allow node user to sudo
RUN echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node