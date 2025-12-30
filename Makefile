dev:
	docker-compose -f compose.yml up --build api db litellm

db:
	docker-compose -f compose.yml up db