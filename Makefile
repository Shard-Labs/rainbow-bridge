help:
	@echo ======================================Local dev=====================================
	@echo 1 run "make init" first time only and one time.
	@echo 2 run "make gen-contarcts"
	@echo 3 run "make setup-clean-and-prepare" clean and prepare env
	@echo 4 run "make start-local-near-and-ganache-nodes" start nearup and ganache
	@echo

# ===============================Init==============================

init: yarn-init gen-contracts
	
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

bsc-build-client:
	cd contracts/near/eth-client && sudo ./build.sh bsc

bsc-build-prover:
	cd contracts/near/eth-prover && sudo ./build.sh bsc

eth-build-client:
	cd contracts/near/eth-client && sudo ./build.sh

eth-build-prover:
	cd contracts/near/eth-prover && sudo ./build.sh

# ===============================Run tests==============================

bsc-test-client:
	cd contracts/near/eth-client && ./test.sh bsc

bsc-test-prover:
	cd contracts/near/eth-prover && ./test.sh bsc

eth-test-client:
	cd contracts/near/eth-client && ./test.sh

eth-test-prover:
	cd contracts/near/eth-prover && ./test.sh

.PHONY: help \
		init \
		init-yarn \
		gen-contracts \
		setup-clean-and-prepare \
		start-local-near-and-ganache-nodes