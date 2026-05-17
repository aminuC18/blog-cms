.PHONY: help build up down logs

help:
	@echo "Frontend Docker (run from frontend/):"
	@echo "  make build   Build CMS image (uses .env build args)"
	@echo "  make up      Start CMS"
	@echo "  make down    Stop CMS"
	@echo "  make logs    Follow web logs"

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f web
