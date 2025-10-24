# 🍱 FoodTok Cloud Infrastructure

This repository contains the complete AWS infrastructure and backend code for **FoodTok**, deployed via the **AWS Cloud Development Kit (CDK)**.

It provisions a serverless and container-based architecture including:
- **AWS Lambda** — Python backend with API Gateway integration  
- **Amazon ECS (Fargate)** — Python Flask microservice for scalable compute  
- **Amazon DynamoDB** — persistent NoSQL user data storage  
- **Amazon S3** — static web hosting & image storage  
- **Amazon API Gateway** — unified external API endpoint for both Lambda & ECS  

---

## Project Structure
```
project/
├── bin/
│   └── cdk-app.ts               # Entry point for CDK app
├── cdk/
│   ├── lambda/
│   │   └── handler.py           # Lambda function code (Python)
│   └── lib/
│       ├── constructs/          # Reusable CDK constructs
│       │   ├── api_gateway.ts
│       │   ├── ddb.ts
│       │   ├── ecs.ts
│       │   ├── lambda.ts
│       │   └── s3.ts
│       └── main-stack.ts        # Root stack wiring constructs
├── ecs_app/
│   ├── app.py                   # Flask app for ECS service
│   └── (Dockerfile lives at repo root)
├── Makefile                     # Deployment automation (deploy/destroy/update-lambda)
├── Dockerfile                   # Container build for ECS app
├── package.json                 # CDK deps (aws-cdk-lib, constructs, ts-node)
├── tsconfig.json                # TypeScript config
├── cdk.json                     # CDK app entry (uses ts-node)
├── README.md
└── .gitignore
```

## Getting Started

### Install dependencies
```bash
npm install
```

### Bootstrap your AWS environment
Run once per AWS account/region:
```bash
make bootstrap
```

### Deploy the stack
```bash
make deploy
```

This will build and deploy:
> - S3 buckets (website + image storage)  
> - DynamoDB table  
> - Lambda function + API Gateway routes  
> - ECS Fargate service + ALB  
> - Outputs URLs to access both services 

## Common Commands

| Command | Description |
|----------|-------------|
| `make bootstrap` | Bootstraps CDK in your AWS account |
| `make deploy` | Synthesizes & deploys the full stack |
| `make update-lambda` | Packages and uploads new Lambda code (`cdk/lambda/handler.py`) |
| `make destroy` | Tears down all deployed resources |
| `make clean` | Removes CDK build artifacts |
| `make logs-ecs` | Tails ECS service logs (recommend using cloudwatch logs via AWS console)|
| `make logs-lambda` | Tails Lambda logs (recommend using cloudwatch via on AWS console)|

---

## Testing the Endpoints

After `make deploy`, check your deployment outputs:

### Example Outputs:
```bash
ApiGatewayUrl = https://abc123.execute-api.us-east-1.amazonaws.com/prod/
ECSLoadBalancerDNS = FoodTokStack-ECSConstruct-LB1234567890.us-east-1.elb.amazonaws.com
```

### Lambda endpoints
```bash
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/hello
curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/prod/insert \
     -H "Content-Type: application/json" \
     -d '{"userId": "lambdaUser", "favorite_color": "blue"}'
```

### ECS endpoints (via API Gateway)
```bash
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/helloECS
curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/prod/insertECS \
     -H "Content-Type: application/json" \
     -d '{"userId": "ecsUser", "favorite_color": "green"}'
```

### ECS direct ALB (for debugging)
```bash
curl http://FoodTokStack-ECSConstruct-LB1234567890.us-east-1.elb.amazonaws.com/helloECS
```

## Outputs Explained

| Output | Description |
|--------|--------------|
| **ApiGatewayUrl** | Base URL for unified API (Lambda + ECS) |
| **ECSLoadBalancerDNS** | Direct ALB endpoint for ECS service |
| **WebsiteBucketURL** | Static web hosting URL for S3 website |
| **ImageBucketName** | S3 bucket for user images |
| **DynamoDBTableName** | Table for user data |

---

## Updating the Lambda Function

After editing `cdk/lambda/handler.py`, redeploy Lambda only:

```bash
make update-lambda
```

This zips `cdk/lambda/` into `lambda.zip`, uploads it to AWS Lambda, and deletes the local ZIP after success.

---

## Destroy the Stack

To tear down **all** resources and avoid charges:

```bash
make destroy
```

This command removes:
- Lambda & ECS services  
- API Gateway  
- DynamoDB table  
- S3 buckets (website + images)  
- IAM roles and supporting resources  

---

## Security Notes

- Never commit AWS credentials or `.env` files.  
- Ensure your `.gitignore` includes:
```pre
node_modules/
cdk.out/
lambda.zip
pycache/
.env
```
- IAM permissions are scoped to the Lambda and ECS roles via CDK grants.


## Next Steps

- Add authentication (Cognito)
- Add additional DDB tables as needed
- Configure github upload triggers for S3 Frontend and Backend redeploy
- Configure CloudFront for CDN hosting of your S3 site  
- Integrate CloudWatch dashboards for monitoring  

<sup>Ren was here</sup>