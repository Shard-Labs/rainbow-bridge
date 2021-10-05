# =============================== Testnet dockerized ==============================
# Do not use this on this directory, it is part of the main Makefile

## to START all relayer services
docker-start-relayer:
	docker-compose -f .docker.bsc/testnet/docker-compose.yml up -d

## to STOP all relayer services
docker-stop-all:
	docker-compose -f .docker.bsc/testnet/docker-compose.yml down -v

## run this when source code updated
docker-update:
	docker-compose -f .docker.bsc/testnet/docker-compose.yml build

## get the services status
docker-status:
	docker-compose -f .docker.bsc/testnet/docker-compose.yml ps

## all services logs
docker-logs-all:
	docker-compose -f .docker.bsc/testnet/docker-compose.yml logs -f