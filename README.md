# FoodTok

FoodTok pairs a Next.js frontend with a Django backend to deliver food discovery and reservations. Docker Compose (orchestrated via the primary `Makefile`) runs the stack locally, while AWS CDK deploys all infrastructure programmatically.

## Prerequisites
- Docker (20+ recommended)
- Docker Compose (bundled with recent Docker Desktop/CLI)
- GNU Make
- AWS CLI configured with credentials/region for cloud deploys

## Local Development
The stack now uses separate Compose files for backend and frontend (`docker-compose.backend.yml` and `docker-compose.frontend.yml`). Targets are split accordingly in the `Makefile`.

**Backend (Django + LocalStack/DynamoDB)**
- `make backend-build` — build backend images.
- `make backend-up` — start backend stack (API at `http://localhost:8080`).
- `make backend-down` — stop backend stack and remove volumes.
- `make backend-ps` — list backend containers.

**Frontend (Next.js)**
- `make frontend-build` — build the frontend image.
- `make frontend-up` — start the frontend (served at `http://localhost:3000`, expects backend on 8080).
- `make frontend-down` — stop the frontend and remove volumes.
- `make frontend-ps` — list frontend containers.
- Frontend needs a `.env` in `FoodTok_Frontend/` before running. Suggested defaults:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8080/api
  NEXT_PUBLIC_USE_MOCKS=false
  NEXT_PUBLIC_RESTAURANT_SOURCE=yelp
  NEXT_PUBLIC_YELP_CLIENT_ID=
  YELP_API_KEY=
  ```
  Get a Public Yelp Client ID and Yelp API key at https://www.yelp.com/developers/v3/manage_app.

**All services**
- `make build-all` — build backend and frontend images.
- `make up-all` — start both stacks.
- `make down-all` — stop and remove both stacks.
- `make ps-all` — list all containers.

**Backend health checks**
- `make check` — Django system checks.
- `make test` — Django test suite.
- `make smoke` — imports the project inside the container to verify basics.

## Cloud Deployment
- Infrastructure and services are defined with AWS CDK (TypeScript) and driven by the same `Makefile`.
- `make deploy` — synthesize and deploy the CDK stack (no approval prompts) and invoke the test-runner Lambda, writing results to `tests/test-output.json`.
- `make bootstrap` — one-time CDK bootstrap for a new AWS account/region.
- `make destroy` — remove the deployed stack (irreversible for data).
- `make clean` — remove local CDK artifacts (`cdk.out`).
- Before deploying, ensure AWS credentials, the target region, and any required environment variables are set; the Makefile uses the `PROFILE` and `AWS_REGION` variables if you need to override defaults. Use `USE_SUDO=1` if your Docker setup requires sudo (e.g., `make backend-up USE_SUDO=1`).
