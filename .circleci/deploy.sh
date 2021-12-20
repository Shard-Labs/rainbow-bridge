ssh -p $SSH_PORT -T $SSH_USER@$SSH_HOST <<EOA
ssh -T $SSH_NESTED_HOST <<EOB
cd /srv/rainbow-bridge && git pull && make -f .docker.bsc/testnet/Makefile bsc-testnet-update && make -f .docker.bsc/testnet/Makefile bsc-testnet-start-relayer && make -f .docker.bsc/testnet/Makefile bsc-testnet-status
EOB
EOA