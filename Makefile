dev:
	docker-compose -f compose.yml up --build api db

db:
	docker-compose -f compose.yml up db