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

# deploy contracts to testnets NEAR and BSC
deploy-full-contracts:
	cli/index.js init-near-contracts
	cli/index.js init-eth-ed25519
	cli/index.js init-eth-client
	cli/index.js init-eth-prover
	cli/index.js init-eth-erc721
	cli/index.js init-eth-erc721-locker
	cli/index.js init-near-nft-factory
# deploy-factory:

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

mint-erc721:
	cli/index.js TESTING mint-erc721-tokens 0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39
	
get-balance:
	cli/index.js TESTING get-bridge-on-near-nft-balance --near-receiver-account node0

# transfer ERC721 from eth to near
transfer-eth-erc721-to-near:
	cli/index.js TESTING transfer-eth-erc721-to-near \
		--tokenId 1 \
		--eth-sender-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 \
		--near-receiver-account node0 \
		--near-master-account nearnftfactory \

transfer-eth-erc721-from-near:
	cli/index.js TESTING transfer-eth-erc721-from-near \
		--tokenId 1 \
		--near-sender-account node0 \
		--near-sender-sk ed25519:3D4YudUQRE39Lc4JHghuB5WM8kbgDDa34mnrEP5DdTApVH81af7e2dWgNPEaiQfdJnZq1CNPp5im4Rg5b733oiMP \
		--eth-receiver-address 0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39
