# Deploy to BSC mainnet
1. Create **config.json** file in the project root and past configurations inside it.
2. Rename **example.env** to **.env** file inside **.docker.bsc/mainnet/** folder an update Private Keys.
3. Build docker compose file => `make -f .docker.bsc/mainnet/Makefile docker-update`.
4. Start relayers => `make -f .docker.bsc/mainnet/Makefile docker-start-relayer`.