COMPOSE_BG := -f docker-compose.bluegreen.yml

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

build:
	docker compose build

# --- Blue/green (Lightsail + Nginx no host) ---
up-bg:
	docker compose $(COMPOSE_BG) up -d

down-bg:
	docker compose $(COMPOSE_BG) down

logs-bg:
	docker compose $(COMPOSE_BG) logs -f

logs-green:
	docker compose $(COMPOSE_BG) logs -f app-green

logs-blue:
	docker compose $(COMPOSE_BG) logs -f app-blue

build-bg:
	docker compose $(COMPOSE_BG) build app-blue

test:
	npm run test
