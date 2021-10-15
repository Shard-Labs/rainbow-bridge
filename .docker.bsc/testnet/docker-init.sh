#!/bin/bash
set -xeo pipefail
source /usr/src/testing/bsc_test.env

cd /usr/src/contracts/eth/nearbridge/ && yarn && yarn build
cd /usr/src/contracts/eth/nearprover/ && yarn && yarn build

cd /usr/src && cli/index.js clean
cd /usr/src && cli/index.js prepare

cd /usr/src && cli/index.js start near-node
cd /usr/src && cli/index.js start ganache
sleep 15

cd /usr/src && cli/index.js init-near-contracts \
   --near-client-contract-path ${PWD}/${NEAR_BSC_CLIENT_CONTRACT} \
   --near-prover-contract-path ${PWD}/${NEAR_BSC_PROVER_CONTRACT}

cd /usr/src && cli/index.js init-eth-ed25519
cd /usr/src && cli/index.js init-eth-client
cd /usr/src && cli/index.js init-eth-prover
cd /usr/src && cli/index.js init-eth-erc20
cd /usr/src && cli/index.js init-eth-locker
cd /usr/src && cli/index.js init-near-token-factory

cd /usr/src && cli/index.js stop near-node
cd /usr/src && cli/index.js stop ganache
