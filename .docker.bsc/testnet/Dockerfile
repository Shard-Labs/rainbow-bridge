FROM ubuntu:18.04

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH \
    LC_ALL=C.UTF-8 \
    LANG=C.UTF-8 \
    PATH=~/.local/bin:$PATH \
    DEBIAN_FRONTEND=noninteractive

## deps
RUN apt-get update -qq && apt-get install -y \
    build-essential \
    curl \
    clang \
    cmake \
    git \
    g++ \
    libssl-dev \
    llvm \
    netcat \
    pkg-config \
    python3 \
    python3-pip \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*  \
    && curl -sL https://deb.nodesource.com/setup_12.x | bash -

RUN apt-get install nodejs && npm -g install ganache-cli yarn

RUN curl https://sh.rustup.rs -sSf | \
    sh -s -- -y --no-modify-path --default-toolchain nightly-2020-05-15

RUN curl -L https://golang.org/dl/go1.16.linux-amd64.tar.gz --output go1.16.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.16.linux-amd64.tar.gz

RUN pip3 install --user nearup && \
    mv /root/.local/bin/nearup /usr/bin/

WORKDIR /usr/src
ENV PATH /usr/local/go/bin:$PATH
RUN go version

## move src
COPY ./ ./

## init
RUN yarn && \
    yarn install

RUN bash .docker.bsc/testnet/docker-init.sh
