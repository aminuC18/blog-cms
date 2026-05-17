.PHONY: help up-backend up-frontend down-backend down-frontend

help:
	@echo "Blog CMS — run Docker from each app directory:"
	@echo "  cd backend  && cp .env.example .env && make up"
	@echo "  cd frontend && cp .env.example .env && make up"
	@echo ""
	@echo "Or from repo root:"
	@echo "  make up-backend   Start API stack"
	@echo "  make up-frontend  Start CMS"
	@echo ""
	@echo "Deploy: see deploy/README.md"

up-backend:
	cd backend && docker compose up -d --build

up-frontend:
	cd frontend && docker compose up -d --build

down-backend:
	cd backend && docker compose down

down-frontend:
	cd frontend && docker compose down
