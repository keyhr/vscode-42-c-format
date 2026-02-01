FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

RUN dpkg --add-architecture amd64 && \
  apt-get update && apt-get install -y \
  python3 \
  python3-pip \
  pipx \
  clang-format \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/node/dev && chown -R node:node /home/node/dev
COPY --chown=node:node ./sample-project /home/node/dev
