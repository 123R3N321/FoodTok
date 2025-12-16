# ---------------------------
# Docker Compose Makefile
# ---------------------------
DC := docker compose
ifeq ($(USE_SUDO),1)
DC := sudo docker compose
endif

FRONTEND_PROJECT := foodtok-frontend
BACKEND_PROJECT := foodtok-backend

FRONTEND_DIRECTORY := FoodTok_Frontend
BACKEND_DIRECTORY := FoodTok_Backend

FRONTEND_FILE := docker-compose.frontend.yml
BACKEND_FILE := docker-compose.backend.yml

FRONTEND_DC := $(DC) -p $(FRONTEND_PROJECT) -f $(FRONTEND_FILE)
BACKEND_DC := $(DC) -p $(BACKEND_PROJECT) -f $(BACKEND_FILE)

BACKEND_APP = backend
BACKEND_RUN = $(BACKEND_DC) run --rm --no-deps $(BACKEND_APP)

# ---------- Backend targets ----------

backend-build:
	$(BACKEND_DC) build --no-cache

backend-up:
	$(BACKEND_DC) up -d

backend-down:
	$(BACKEND_DC) down -v

backend-ps:
	$(BACKEND_DC) ps

# ---------- Frontend targets ----------

frontend-build:
	$(FRONTEND_DC) build --no-cache

frontend-up:
	$(FRONTEND_DC) up -d

frontend-down:
	$(FRONTEND_DC) down -v

frontend-ps:
	$(FRONTEND_DC) ps

# ---------- Combined targets ----------

build-all: backend-build frontend-build

up-all: backend-up frontend-up

down-all: frontend-down backend-down

ps-all: backend-ps frontend-ps

# ---- CI helpers ----
check:
	$(BACKEND_RUN) sh -c 'python manage.py check --verbosity 2'

test:
	$(BACKEND_RUN) python manage.py test --verbosity 2

smoke:
	$(BACKEND_RUN) python3 -c "import importlib; importlib.import_module('ecs_project'); print('ecs_project import OK')"

ci: backend-build check smoke test

# ------ Frontend Testing ------

frontend-test:
	cd $(FRONTEND_DIRECTORY) && npm test -- --passWithNoTests

frontend-test-coverage:
	cd $(FRONTEND_DIRECTORY) && npm test -- --coverage --passWithNoTests

frontend-test-watch:
	cd $(FRONTEND_DIRECTORY) && npm test -- --watch

# ------ Backend Testing ------

backend-test:
	cd $(BACKEND_DIRECTORY) && pytest tests/api/ -v --full-trace

backend-test-coverage:
	cd $(BACKEND_DIRECTORY) && pytest tests/api/ -v --cov=. --cov-report=html --cov-report=term

backend-test-no-stack:
	FOODTOK_SMOKE_MANAGE_STACK=0 pytest $(BACKEND_DIRECTORY)/tests/api/ -v

# ------ Load Testing ------

HOST ?=
ifeq ($(HOST),)
	LOAD_TEST_HOST := http://localhost:8000
else
	LOAD_TEST_HOST := $(HOST)
endif

load-test:
	@echo "Running load test (1-20 users)..."
	locust -f load_tests/locustfile.py --host=$(LOAD_TEST_HOST) --headless --users 20 --spawn-rate 0.16 --run-time 3m --csv=load_tests/results

load-test-local:
	@echo "Running load test against local backend..."
	make load-test HOST=http://localhost:8000

# ---------------------------
# AWS CDK Project Makefile
# ---------------------------
PROJECT_PREFIX ?= FoodTok
APP_NAME = FoodTokStack
CDK_CMD = npx cdk
AWS_REGION ?= us-east-1
PROFILE ?= default

# Default target
all: deploy


# ---------------------------
# Setup and Installation
# ---------------------------

install:
	@echo "Installing dependencies..."
	npm install

bootstrap:
	@echo "Bootstrapping CDK environment..."
	$(CDK_CMD) bootstrap aws://$$(aws sts get-caller-identity --query Account --output text)/$(AWS_REGION) --profile $(PROFILE)

# ---------------------------
# Build and Deployment
# ---------------------------

synth:
	@echo "Synthesizing CloudFormation template..."
	$(CDK_CMD) synth --profile $(PROFILE)

deploy:
	@echo "Deploying stack $(APP_NAME)..."
	$(CDK_CMD) deploy $(APP_NAME) --require-approval never --profile $(PROFILE)

# ---------------------------
# verification: can also manually run from tests/run_api_from_test_output.py
# ---------------------------

verify:
	@echo "Verifying deployed API via test-output.json..."
	python3 tests/run_api_from_test_output.py

# ---------------------------
# Teardown
# ---------------------------

destroy:
	@echo "Destroying stack $(APP_NAME)..."
	$(CDK_CMD) destroy $(APP_NAME) --force --profile $(PROFILE)

# ---------------------------
# Cleanup
# ---------------------------

clean:
	@echo "Cleaning up CDK output files..."
	rm -rf cdk.out

# ---------------------------
# Help
# ---------------------------

help:
	@echo "Available commands:"
	@echo "  make install                - Install dependencies"
	@echo "  make bootstrap              - Bootstrap CDK environment"
	@echo "  make synth                  - Synthesize CloudFormation template"
	@echo "  make deploy                 - Deploy the stack"
	@echo "  make deploy-test            - Deploy stack and run load test"
	@echo "  make deploy-test-destroy    - Deploy, test, and destroy"
	@echo "  make destroy                - Destroy the stack"
	@echo "  make clean                  - Remove local build artifacts"
	@echo "  make load-test-local        - Run load test on local backend"
