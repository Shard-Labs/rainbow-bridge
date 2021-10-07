# generate ether contracts
gen-contracts:
	cd contracts/eth/nearbridge/ && yarn && yarn build
	cd contracts/eth/nearprover/ && yarn && yarn build

setup-clean-and-prepare:
	cli/index.js clean
	cli/index.js prepare

# start near blockchain and connect with ganache.
# --blockTime ${GANACHE_BLOCK_TIME:-12}
start-local-near-and-ganache-nodes:
	cli/index.js start near-node
	cli/index.js start ganache
	ganache --port 9545 \
        --gasLimit 10000000 \
        --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200,10000000000000000000000000000" \
        --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201,10000000000000000000000000000" \
        --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202,10000000000000000000000000000" \
        --server.ws \
        --db localnet -h 0.0.0.0

# deploy contracts to testnets NEAR and BSC
deploy-full-contracts:
	cli/index.js init-near-contracts
	cli/index.js init-eth-ed25519
	cli/index.js init-eth-client
	cli/index.js init-eth-prover
	cli/index.js init-eth-erc721
	cli/index.js init-eth-erc721-locker
deploy-factory:
	cli/index.js init-near-nft-factory

# start relayers
start-relayer:
	cli/index.js start eth2near-relay
	cli/index.js start near2eth-relay
	cli/index.js start bridge-watchdog
	pm2 logs

# stop relayers
stop-all:
	cli/index.js stop all

# get near balance of a wallet
bsc-testnet-near-balance:
	cli/index.js TESTING get-bridge-on-near-balance \
		--near-receiver-account ${NEAR_RECEIVER_ACCOUNT}

# transfer ERC721 from eth to near
transfer-eth-erc721-to-near:
	cli/index.js TESTING transfer-eth-erc721-to-near \
		--tokenId \
		--eth-sender-sk ${ETH_MASTER_SK} \
		--near-receiver-account ${NEAR_RECEIVER_ACCOUNT} \
		--near-master-account ${NEAR_RECEIVER_ACCOUNT} \
		--near-master-sk ${NEAR_RECEIVER_SK}