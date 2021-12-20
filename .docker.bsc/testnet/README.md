# Deploy the BSC testnet bridge
1. Create **config.json** file in the project root and add configurations inside it.
2. Build docker compose file => `make -f .docker.bsc/testnet/Makefile bsc-testnet-update`.
3. Start relayers => `make -f .docker.bsc/testnet/Makefile bsc-testnet-start-relayer`.

# Status of the BSC testnet bridge
4. Terminate relayers => `make -f .docker.bsc/testnet/Makefile bsc-testnet-status`.

# Logs of the BSC testnet bridge
4. Terminate relayers => `make -f .docker.bsc/testnet/Makefile bsc-testnet-logs-all`.

# Update the BSC testnet bridge
1. Change **config.json** file in the project root as you want and add configurations inside it.
2. Build docker compose file => `make -f .docker.bsc/testnet/Makefile bsc-testnet-update`.
3. Recreate relayers => `make -f .docker.bsc/testnet/Makefile bsc-testnet-start-relayer`.

# Terminate the BSC testnet bridge
4. Terminate relayers => `make -f .docker.bsc/testnet/Makefile bsc-testnet-stop-all`.
