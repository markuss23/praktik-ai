backend-dev:
	docker compose -f compose.yml up --build api db keycloak seaweedfs-master seaweedfs-filer seaweedfs-volume

db:
	docker compose -f compose.yml up db

# Aktualizace promptu/modelu v system_setting podle seed.py (v běžícím api kontejneru).
# Použití: make update-settings                      # všechny klíče
#          make update-settings KEYS=course_planner  # jen vybrané klíče
update-settings:
	docker compose -f compose.yml exec api python -m scripts.update_system_settings $(KEYS)
