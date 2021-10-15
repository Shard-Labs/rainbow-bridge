#!/bin/bash
set -xeo pipefail
source /usr/src/testing/bsc_test.env

cd /usr/src/contracts/eth/nearbridge/ && yarn && yarn build
cd /usr/src/contracts/eth/nearprover/ && yarn && yarn build

cd /usr/src && cli/index.js clean
cd /usr/src && cli/index.js prepare
mkdir -p ~/.near/localnet/node0

echo '{"account_id":"node0","public_key":"ed25519:7PGseFbWxvYVgZ89K1uTJKYoKetWs7BJtbyXDzfbAcqX","secret_key":"ed25519:3D4YudUQRE39Lc4JHghuB5WM8kbgDDa34mnrEP5DdTApVH81af7e2dWgNPEaiQfdJnZq1CNPp5im4Rg5b733oiMP"}' > ~/.near/localnet/node0/validator_key.json
echo '{"account_id":"","public_key":"ed25519:7PGseFbWxvYVgZ89K1uTJKYoKetWs7BJtbyXDzfbAcqX","secret_key":"ed25519:3D4YudUQRE39Lc4JHghuB5WM8kbgDDa34mnrEP5DdTApVH81af7e2dWgNPEaiQfdJnZq1CNPp5im4Rg5b733oiMP"}' > ~/.near/localnet/node0/node_key.json

cd /usr/src && cli/index.js start near-node
cd /usr/src && cli/index.js start ganache --near-client-validate-header-mode bsc
sleep 15

echo ${NEAR_BSC_CLIENT_CONTRACT}
echo ${NEAR_BSC_PROVER_CONTRACT}

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
