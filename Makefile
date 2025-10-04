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

# ---- CI helpers ----
check:
	$(DC) run --rm --no-deps $(APP) sh -c '\
		export DJANGO_SETTINGS_MODULE=FoodTok.settings; \
		export SECRET_KEY=ci-only-secret; \
		python manage.py check --verbosity 2 \
	'

smoke:
	$(DC) run --rm --no-deps $(APP) python -c "import importlib; importlib.import_module('FoodTok'); print('FoodTok import OK')"

ci: build check smoke

# Make more helper functions later.

# Infra commands