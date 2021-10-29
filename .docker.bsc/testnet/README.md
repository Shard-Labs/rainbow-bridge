# Local deployment using Docker
### Pre-requisites
- docker
- docker-compose
- make

## Usage
### START all relayer services
It will build the docker images, then, run the relayers as `docker-compose` services.
```
make docker-start-relayer
```

### Services status
```
make docker-status
```

### Services logs
```
make docker-logs-all
```

### STOP all relayer services
```
make docker-stop-all
```

### Update services
Run this when source code updated.
```
make docker-update
```