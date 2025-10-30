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

# ---------------------------
# Project Build Helper Commands
# ---------------------------
DC = docker compose
APP = web
ENV_FILE ?= .env.example # We might need to change this in the future to use real env file locally
DC_RUN = $(DC) --env-file $(ENV_FILE) run --rm --no-deps $(APP)

.PHONY: build up ps down

build:
	@echo "Building Docker containers..."
	$(DC) build

up:
	@echo "Starting Docker containers..."
	$(DC) up -d

down:
	@echo "Stopping Docker containers..."
	$(DC) down

ps: 
	@echo "Listing Docker containers..."
	$(DC) ps

# ---------------------------
# CI and Smoke Tests
# ---------------------------

.PHONY: build test smoke

build:
	@echo "Building project..."
	$(DC) build 
	@echo "Build successful."

test:
	@echo "Running CI tests..."
	python3 -m unittest discover -s tests # Need to update to run from Docker

smoke: build
	@echo "Running smoke test..."
	$(DC_RUN) python3 manage.py check --deploy
	@echo "Smoke test passed."

ci: build smoke