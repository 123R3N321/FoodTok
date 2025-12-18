# FoodTok

FoodTok is a full-stack web application that enables users to discover restaurants, save favorites, and manage reservations all in one place. The application is built with a Next.js frontend and Django backend, orchestrated locally via Docker Compose and the primary `Makefile`, while AWS CDK handles programmatic infrastructure deployment to the cloud.

## Prerequisites
- Docker (20+ recommended)
- Docker Compose (bundled with recent Docker Desktop/CLI)
- GNU Make
- AWS CLI configured with credentials/region for cloud deploys
- **Frontend Environment Configuration**: Create a `.env` file in `FoodTok_Frontend/` with the following structure:
  ```
  BACKEND_API_URL=http://backend:8080/api
  NEXT_PUBLIC_USE_MOCKS=false
  NEXT_PUBLIC_RESTAURANT_SOURCE=yelp
  NEXT_PUBLIC_YELP_CLIENT_ID=your_yelp_client_id
  YELP_API_KEY=your_yelp_api_key
  ```
  Get your Yelp Client ID and API key at https://www.yelp.com/developers/v3/manage_app.

## Local Development
The stack uses Docker Compose with orchestrated targets in the `Makefile` to manage both frontend and backend services together. Use the combined targets below to run the full stack locally.

**Running the Full Stack**

Once running, the backend API is available at `http://localhost:8080` and the frontend is served at `http://localhost:3000`. DynamoDB Admin GUI is being served at `http://localhost:8001`.

- `make build-all` — build both backend and frontend images.
- `make up-all` — start the complete stack.
- `make down-all` — stop and remove all services and volumes.
- `make ps-all` — list all running containers.

**Backend Health Checks**
- `make check` — run Django system checks to validate configuration and detect common issues.
- `make test` — execute the Django test suite to verify backend functionality.
- `make smoke` — run a basic smoke test that imports the project inside the container to verify the environment is properly configured.

## Cloud Deployment
Infrastructure and services are defined with AWS CDK (TypeScript) and driven by the same `Makefile`.
- `make bootstrap` — one-time CDK bootstrap for a new AWS account/region.
- `make deploy` — synthesize and deploy the CDK stack 
- `make destroy` — remove the deployed stack (irreversible for data).
- `make clean` — remove local CDK artifacts (`cdk.out`).
- Before deploying, ensure AWS credentials, the target region, and any required environment variables are set via the AWS cli; the Makefile uses the `PROFILE` and `AWS_REGION` variables if you need to override defaults. Use `USE_SUDO=1` if your Docker setup requires sudo (e.g., `make up-all USE_SUDO=1`).

## Documentation
Comprehensive project documentation is available in `docs/`:

- **[FoodTok-Final-Report.pdf](docs/FoodTok-Final-Report.pdf)** — Complete academic project report covering problem statement, solution architecture, technology stack, deployment strategy, testing approach, technical challenges, and key achievements
- **[FoodTok-Final-Presentation.pdf](docs/FoodTok-Final-Report.pdf)** — Concise final slides used for our demo
- **[foodtok-general-overview.md](docs/Documentation/foodtok-general-overview.md)** — High-level overview of FoodTok's features, business logic, and technology choices
- **[foodtok-technical-overview.md](docs/Documentation/foodtok-technical-overview.md)** — Deep dive into technical implementation details including race condition prevention, hold system architecture, and match scoring algorithm
- **[backend-overview.md](docs/Documentation/backend-overview.md)** — Complete backend API documentation with all 18 endpoints, request/response schemas, and error handling
- **[backend-endpoint-schemas.md](docs/Documentation/backend-endpoint-schemas.md)** — Detailed API schemas and data models for backend endpoints
- **[backend-test.md](docs/Documentation/backend-test.md)** — Backend testing strategy, pytest configuration, and coverage requirements
- **[frontend-test.md](docs/Documentation/frontend-test.md)** — Frontend testing approach with Jest and React Testing Library
- **[loadtest.md](docs/Documentation/loadtest.md)** — Load testing methodology using Locust, performance benchmarks, and results analysis
