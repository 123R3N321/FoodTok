# ---------------------------
# AWS CDK Project Makefile
# ---------------------------

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
	@echo "🧹 Cleaning up CDK output files..."
	rm -rf cdk.out

# ---------------------------
# Help
# ---------------------------

help:
	@echo "Available commands:"
	@echo "  make install     	- Install dependencies"
	@echo "  make bootstrap   	- Bootstrap CDK environment"
	@echo "  make synth       	- Synthesize CloudFormation template"
	@echo "  make deploy      	- Deploy the stack"
	@echo "  make destroy     	- Destroy the stack"
	@echo "  make clean       	- Remove local build artifacts"
	@echo "  make update_lambda	- Remove local build artifacts"
