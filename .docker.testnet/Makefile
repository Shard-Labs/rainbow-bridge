# =============================== Testnet dockerized ==============================
# Do not use this on this directory, it is part of the main Makefile

## to START all relayer services
docker-start-relayer:
	docker-compose -f .docker.testnet/services.yml up -d

## to STOP all relayer services
docker-stop-all:
	docker-compose -f .docker.testnet/services.yml down -v

## run this when source code updated
docker-update:
	docker-compose -f .docker.testnet/services.yml build

## get the services status
docker-status:
	docker-compose -f .docker.testnet/services.yml ps

## all services logs
docker-logs-all:
	docker-compose -f .docker.testnet/services.yml logs -f