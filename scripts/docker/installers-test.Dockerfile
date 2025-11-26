FROM debian:12-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    sudo \
    git \
    bash \
    gnupg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/bulencoin
COPY . /opt/bulencoin/
