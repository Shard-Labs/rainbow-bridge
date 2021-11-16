ssh -p $SSH_PORT -T $SSH_USER@$SSH_HOST <<EOA
ssh -T $SSH_NESTED_HOST <<EOB
cd /opt/near/rainbow-bridge && git pull && make bsc-testnet-update && make bsc-testnet-start-relayer && make bsc-testnet-status
EOB
EOA