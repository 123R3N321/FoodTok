# ---------------------------
# Docker Compose Makefile
# ---------------------------
DC := docker compose
ifeq ($(USE_SUDO),1)
DC := sudo docker compose
endif

FRONTEND_PROJECT := foodtok-frontend
BACKEND_PROJECT := foodtok-backend

FRONTEND_FILE := docker-compose.frontend.yml
BACKEND_FILE := docker-compose.backend.yml

FRONTEND_DC := $(DC) -p $(FRONTEND_PROJECT) -f $(FRONTEND_FILE)
BACKEND_DC := $(DC) -p $(BACKEND_PROJECT) -f $(BACKEND_FILE)

BACKEND_APP = ecs-app
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

down-all: backend-down frontend-down

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
	cd FoodTok_Frontend && npm test -- --passWithNoTests

frontend-test-coverage:
	cd FoodTok_Frontend && npm test -- --coverage --passWithNoTests

frontend-test-watch:
	cd FoodTok_Frontend && npm test -- --watch

# ------ Backend Testing ------

backend-test:
	cd ecs_app && pytest tests/api/ -v

backend-test-coverage:
	cd ecs_app && pytest tests/api/ -v --cov=. --cov-report=html

backend-test-no-stack:
	FOODTOK_SMOKE_MANAGE_STACK=0 pytest ecs_app/tests/api/ -v

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
# Lambda-only Deployment
# ---------------------------

# Update Lambda function code without redeploying entire stack
update-lambda:
	@echo "Packaging and updating Lambda code..."
	cd cdk/lambda && zip -r ../../lambda.zip . > /dev/null
	LAMBDA_NAME=$$(aws cloudformation describe-stack-resources \
		--stack-name $(APP_NAME) \
		--query "StackResources[?ResourceType=='AWS::Lambda::Function'].PhysicalResourceId" \
		--output text --profile $(PROFILE) | grep LambdaConstruct | awk '{print $$NF}'); \
	echo "Uploading latest code to $$LAMBDA_NAME..."; \
	aws lambda update-function-code \
		--function-name $$LAMBDA_NAME \
		--zip-file fileb://lambda.zip \
		--region $(AWS_REGION) \
		--profile $(PROFILE) > /dev/null; \
	rm lambda.zip; \
	echo "Lambda function updated successfully."


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

	@echo "Running Lambda test-runner (currently only E2E)..."
	FN_NAME=$$(aws cloudformation list-exports --profile $(PROFILE) \
	  --query "Exports[?Name=='$(PROJECT_PREFIX)-TestRunnerFnName'].Value | [0]" --output text); \
	if [ -z "$$FN_NAME" ] || [ "$$FN_NAME" = "None" ]; then \
	  echo "ERROR: Could not find export $(PROJECT_PREFIX)-TestRunnerFnName. Did you add CfnOutput and deploy?"; \
	  exit 1; \
	fi; \
	echo "Invoking $$FN_NAME..."; \
	aws lambda invoke --function-name $$FN_NAME --profile $(PROFILE) --cli-binary-format raw-in-base64-out \
	  --payload '{}' ./tests/test-output.json >/dev/null; \
	echo "Lambda returned (stored in test-output.json in project root dir):"; \
	cat ./test-output.json | jq .

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
	@echo "  make install     	- Install dependencies"
	@echo "  make bootstrap   	- Bootstrap CDK environment"
	@echo "  make synth       	- Synthesize CloudFormation template"
	@echo "  make deploy      	- Deploy the stack, run e2e test with cognito"
	@echo "  make destroy     	- Destroy the stack"
	@echo "  make clean       	- Remove local build artifacts"
	@echo "  make update_lambda	- Remove local build artifacts"
