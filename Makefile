backend-dev:
	docker compose -f compose.yml up --build api db keycloak seaweedfs-master seaweedfs-filer seaweedfs-volume

db:
	docker compose -f compose.yml up db