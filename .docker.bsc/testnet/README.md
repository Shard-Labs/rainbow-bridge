# Deploy to BSC testnet
1. Create **config.json** file in the project root and past configurations inside it.
2. Build docker compose file => `make -f .docker.bsc/testnet/Makefile bsc-testnet-update`.
3. Start relayers => `make -f .docker.bsc/testnet/Makefile bsc-testnet-start-relayer`.
4. Stop relayers => `make -f .docker.bsc/testnet/Makefile bsc-testnet-stop-all`.