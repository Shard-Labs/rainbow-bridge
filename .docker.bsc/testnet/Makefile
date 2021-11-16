# =============================== Testnet dockerized ==============================
# Do not use this on this directory, it is part of the main Makefile

## to START all relayer services
bsc-testnet-start-relayer:
	docker-compose -f .docker.bsc/testnet/services.yml up -d

## to STOP all relayer services
bsc-testnet-stop-all:
	docker-compose -f .docker.bsc/testnet/services.yml down -v

## run this when source code updated
bsc-testnet-update:
	docker-compose -f .docker.bsc/testnet/services.yml build

## get the services status
bsc-testnet-status:
	docker-compose -f .docker.bsc/testnet/services.yml ps

## all services logs
bsc-testnet-logs-all:
	docker-compose -f .docker.bsc/testnet/services.yml logs -f