.PHONY: help build up down logs

help:
	@echo "Backend Docker (run from backend/):"
	@echo "  make build   Build API image"
	@echo "  make up      Start API (MONGO_URI from .env — use Atlas)"
	@echo "  make down    Stop stack"
	@echo "  make logs    Follow API logs"

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f api
