USE_SUDO=1

ifdef USE_SUDO
DC = sudo docker compose
else
DC = docker compose
endif
APP = web

# Build Commands
.PHONY: build up down logs ps bash shell
build:
	$(DC) build

up:
	$(DC) up -d

down:
	$(DC) down

logs:
	$(DC) logs -f $(APP)

ps:
	$(DC) ps

bash:
	$(DC) exec $(APP) bash

shell:
	$(DC) exec $(APP) python manage.py shell

# Make more helper functions later.

# Infra commands