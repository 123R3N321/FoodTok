DC := docker compose
ifeq ($(USE_SUDO),1)
DC := sudo docker compose
endif

APP = web
ENV_FILE ?= .env
DC_RUN = $(DC) --env-file $(ENV_FILE) run --rm --no-deps $(APP)

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

# ---- CI helpers ----
check:
	$(DC_RUN) sh -c 'python manage.py check --verbosity 2'

smoke:
	$(DC_RUN) python -c "import importlib; importlib.import_module('FoodTok'); print('FoodTok import OK')"

ci: build check smoke

# Make more helper functions later.

# Infra commands