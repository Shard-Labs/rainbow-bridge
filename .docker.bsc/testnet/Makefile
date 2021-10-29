# =============================== Testnet dockerized ==============================
# Do not use this on this directory, it is part of the main Makefile

.DEFAULT_GOAL := help
.PHONY: help
help:
	@echo "Usage: BSC testnet local deployment"
	@cat Makefile | sed -n '/^\.PHONY: / h; /\(^\t@*echo\|^\t:\)/ {H; x; /PHONY/ s/.PHONY: \(.*\)\n.*"\(.*\)"/    make \1\t\2/p; d; x}'| sort -k2,2 |expand -t 20

## to START all relayer services
.PHONY: docker-start-relayer
docker-start-relayer:
	docker-compose -f docker-compose.yml up -d
	@echo "to START all relayer services"

## to STOP all relayer services
.PHONY: docker-stop-all
docker-stop-all:
	docker-compose -f docker-compose.yml down -v
	@echo "to STOP all relayer services"

## run this when source code updated
.PHONY: docker-update
docker-update:
	docker-compose -f docker-compose.yml build
	@echo "run this when source code updated"

## get the services status
.PHONY: docker-status
docker-status:
	docker-compose -f docker-compose.yml ps
	@echo "get the services status"

## all services logs
.PHONY: docker-logs-all
docker-logs-all:
	docker-compose -f docker-compose.yml logs -f
	@echo "all services logs"