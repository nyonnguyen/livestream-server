.PHONY: help setup start stop restart logs build clean init-db reset-password backup status health

help:
	@echo "Livestream Server Management"
	@echo ""
	@echo "Available commands:"
	@echo "  make setup          - Initial setup (copy .env.example, create dirs)"
	@echo "  make build          - Build all Docker images"
	@echo "  make start          - Start all services"
	@echo "  make stop           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs (all services)"
	@echo "  make logs-srs       - View SRS logs"
	@echo "  make logs-api       - View API logs"
	@echo "  make logs-ui        - View UI logs"
	@echo "  make init-db        - Initialize database with defaults"
	@echo "  make reset-password - Reset admin password (usage: make reset-password PWD=newpass)"
	@echo "  make backup         - Backup database"
	@echo "  make status         - Show service status"
	@echo "  make health         - Check system health"
	@echo "  make clean          - Remove containers and volumes"
	@echo "  make clean-all      - Remove everything including images"

setup:
	@echo "Setting up Livestream Server..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file"; \
		echo "⚠️  Please edit .env and set your configuration"; \
	else \
		echo "✓ .env already exists"; \
	fi
	@mkdir -p data
	@echo "✓ Created data directory"
	@echo ""
	@echo "Next steps:"
	@echo "1. Edit .env file with your settings"
	@echo "2. Run: make build"
	@echo "3. Run: make start"
	@echo "4. Run: make init-db"

build:
	@echo "Building Docker images..."
	docker-compose build

start:
	@echo "Starting services..."
	docker-compose up -d
	@echo "✓ Services started"
	@echo ""
	@echo "Access web UI: http://localhost/"
	@echo "Default login: admin / (check .env for password)"

stop:
	@echo "Stopping services..."
	docker-compose down
	@echo "✓ Services stopped"

restart:
	@echo "Restarting services..."
	docker-compose restart
	@echo "✓ Services restarted"

logs:
	docker-compose logs -f

logs-srs:
	docker-compose logs -f srs

logs-api:
	docker-compose logs -f web-api

logs-ui:
	docker-compose logs -f web-ui

init-db:
	@echo "Initializing database..."
	docker exec -it livestream-api npm run init-db
	@echo "✓ Database initialized"

reset-password:
	@if [ -z "$(PWD)" ]; then \
		echo "Usage: make reset-password PWD=newpassword"; \
		exit 1; \
	fi
	docker exec -it livestream-api npm run reset-password admin $(PWD)

backup:
	@echo "Backing up database..."
	@mkdir -p backups
	docker exec livestream-api cp /app/data/livestream.db /app/data/backup.db
	docker cp livestream-api:/app/data/backup.db ./backups/livestream-$(shell date +%Y%m%d-%H%M%S).db
	@echo "✓ Backup created in backups/"

status:
	@echo "Service Status:"
	@docker-compose ps

health:
	@echo "System Health Check:"
	@echo ""
	@echo "Docker containers:"
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "Resource usage:"
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
	@echo ""
	@echo "API health:"
	@curl -s http://localhost:3000/api/health | python3 -m json.tool || echo "API not responding"
	@echo ""
	@echo "SRS health:"
	@curl -s http://localhost:1985/api/v1/versions | python3 -m json.tool || echo "SRS not responding"

clean:
	@echo "Removing containers and volumes..."
	docker-compose down -v
	@echo "✓ Cleanup complete"

clean-all:
	@echo "Removing everything (containers, volumes, images)..."
	docker-compose down -v --rmi all
	@echo "✓ Full cleanup complete"

# Development targets
dev-api:
	cd web-api && npm run dev

dev-ui:
	cd web-ui && npm run dev

install-api:
	cd web-api && npm install

install-ui:
	cd web-ui && npm install
