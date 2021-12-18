help:
	@echo ======================================Local dev=====================================
	@echo 1 run "make init-yarn" install node packages.
	@echo 2 run "make gen-contarcts" generate ethereum contracts.
	@echo 3 run "make setup-clean-and-prepare" clean and prepare local env.
	@echo 4 run "make start-local-near-and-ganache-nodes" start nearup and ganache.
	@echo 5 run "make deploy-full-contracts" deploy near and eth contracts.
	@echo 6 run "make start-relayer" start relayers.
	@echo 7 run "make stop-all" stop relayers.
	@echo
	@echo ======================================Build Near Contrats=====================================
	@echo "make bsc-build-client" build bsc client near contract.
	@echo "make bsc-build-prover" build bsc prover near contract.
	@echo "make eth-build-client" build eth client near contract.
	@echo "make eth-build-prover" build eth prover near contract.
	@echo
	@echo ======================================Run Near Tests=====================================
	@echo "make bsc-test-client" run tests bsc client
	@echo "make bsc-test-prover" run tests bsc prover
	@echo "make eth-test-client" run tests eth client
	@echo "make eth-test-prover" run tests eth prover
	@echo


# ===============================Init==============================

init-yarn:
	yarn
	yarn install

# ===============================Local==============================

# generate ether contracts
gen-contracts:
	cd contracts/eth/nearbridge/ && yarn && yarn build
	cd contracts/eth/nearprover/ && yarn && yarn build

setup-clean-and-prepare:
	cli/index.js clean
	cli/index.js prepare

# start near blockchain and connect with ganache.
start-local-near-and-ganache-nodes:
	cli/index.js start near-node
	cli/index.js start ganache

# ===============================Deploy contracts localy==============================

# deploy contracts to testnets NEAR and BSC
deploy-full-contracts:
	cli/index.js init-near-contracts
	cli/index.js init-eth-ed25519
	cli/index.js init-eth-client
	cli/index.js init-eth-prover

deploy-token-connector:
	cli/index.js init-eth-locker
	cli/index.js init-near-token-factory

deploy-erc20-token:
	cli/index.js init-erc20-token --eth-erc20-address 0x64544969ed7ebf5f083679233325356ebe738930

# ===============================Relayers==============================

# start relayers
start-relayer:
	cli/index.js start eth2near-relay
	cli/index.js start near2eth-relay
	cli/index.js start bridge-watchdog
	pm2 logs

# stop relayers
stop-all:
	cli/index.js stop all

# ===============================Build NEAR Contracts==============================

# build bsc near client
bsc-build-client:
	cd contracts/near/eth-client && sudo ./build.sh bsc

# build bsc near prover
bsc-build-prover:
	cd contracts/near/eth-prover && sudo ./build.sh bsc

# build eth near client
eth-build-client:
	cd contracts/near/eth-client && sudo ./build.sh

# build eth near prover
eth-build-prover:
	cd contracts/near/eth-prover && sudo ./build.sh

# ===============================Run tests==============================

# test bsc near client
bsc-test-client:
	cd contracts/near/eth-client && ./test.sh bsc

# test bsc near prover
bsc-test-prover:
	cd contracts/near/eth-prover && ./test.sh bsc


# ===============================Test the bsc bridge==============================
testnet-near-balance:
	cli/index.js TESTING get-bridge-on-near-balance --near-receiver-account simple10.testnet

testnet-transfer-eth-to-near:
	cli/index.js TESTING transfer-eth-erc20-to-near \
		--amount 10 --eth-sender-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 \
		--near-receiver-account simple10.testnet \
		--near-master-account simple10.testnet \
		--near-master-sk ed25519:4aFi4332BrFHR2pYXcqsz51P5qL4piHYWYtXggPWxPRxtLxT5veeyfFGyevJpCP7ZW13RzmPa1V2RvkApqYjMXoV

testnet-transfer-near-to-eth:
	cli/index.js TESTING transfer-eth-erc20-from-near \
		--amount 1 \
		--near-sender-sk ed25519:4aFi4332BrFHR2pYXcqsz51P5qL4piHYWYtXggPWxPRxtLxT5veeyfFGyevJpCP7ZW13RzmPa1V2RvkApqYjMXoV \
		--near-sender-account simple10.testnet \
		--eth-receiver-address 0xDf08F82De32B8d460adbE8D72043E3a7e25A3B39

.PHONY: help init yarn-init gen-contracts local-start local-start-bsc local-full-contracts init-config testnet-full-contracts start-relayer stop-all build-eth-client build-bsc-client build-eth-prover test-eth-client near-balance transfer-eth-to-near transfer-near-to-eth
