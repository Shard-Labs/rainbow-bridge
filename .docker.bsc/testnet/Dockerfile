FROM node:16.8.0-alpine3.11
WORKDIR /opt/web

RUN apk --no-cache add git \
					   nodejs \
					   yarn \
					   python3 \
					   python3-dev \
					   py3-pip \
					   py3-psutil \
					   bash \
					   curl \
					   build-base
RUN pip3 install --user nearup && \
	mv /root/.local/bin/nearup /usr/bin/
COPY --from=golang:1.13-alpine /usr/local/go/ /usr/local/go/
ENV PATH="/usr/local/go/bin:${PATH}"

COPY ./ ./

## init
RUN yarn && \
    yarn install

## gen-contracts
RUN cd /opt/web/contracts/eth/nearbridge/ && yarn && yarn build && \
    cd /opt/web/contracts/eth/nearprover/ && yarn && yarn build

## setup-clean-and-prepare
RUN cli/index.js clean && \
    cli/index.js prepare

## start-local-near-and-ganache-nodes
RUN cli/index.js start near-node && \
	cli/index.js start ganache

## testing/Makefile_BSC bsc-deploy-full-contracts-localy
RUN source testing/bsc_test.env && \
	cli/index.js init-near-contracts \
		--near-client-contract-path ${PWD}/${NEAR_BSC_CLIENT_CONTRACT} \
		--near-prover-contract-path ${PWD}/${NEAR_BSC_PROVER_CONTRACT} && \
	cli/index.js init-eth-ed25519 && \
	cli/index.js init-eth-client && \
	cli/index.js init-eth-prover && \
	cli/index.js init-eth-erc20 && \
	cli/index.js init-eth-locker && \
	cli/index.js init-near-token-factory
