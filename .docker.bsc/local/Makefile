# =============================== Testnet dockerized ==============================
# Do not use this on this directory, it is part of the main Makefile

## to START all relayer services
bsc-local-start-relayer:
	docker-compose -f .docker.bsc/local/docker-compose.yml up -d

## to STOP all relayer services
bsc-local-stop-all:
	docker-compose -f .docker.bsc/local/docker-compose.yml down -v

## run this when source code updated
bsc-local-update:
	docker-compose -f .docker.bsc/local/docker-compose.yml build

## get the services status
bsc-local-status:
	docker-compose -f .docker.bsc/local/docker-compose.yml ps

## all services logs
bsc-local-logs-all:
	docker-compose -f .docker.bsc/local/docker-compose.yml logs -f