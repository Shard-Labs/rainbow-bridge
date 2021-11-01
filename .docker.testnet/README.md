# Deploy to BSC testnet
1. Create **config.json** file in the project root and past configurations inside it.
2. Rename **example.env** to **.env** file inside **.docker.testnet/** folder an update Private Keys.
3. Build docker compose file => `make -f .docker.testnet/Makefile docker-update`.
4. Start relayers => `make -f .docker.testnet/Makefile docker-start-relayer`.