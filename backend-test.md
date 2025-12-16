# Backend Tests

The backend test suite uses **pytest** to run integration tests against the running Django API. Tests are executed **locally on the host machine** against a Docker Compose stack that provides DynamoDB Local, LocalStack (S3), and the Django backend service.

## Prerequisites

Before running backend tests, ensure:

- Docker and Docker Compose are installed
- Python 3.11+ is available
- Backend dependencies are installed (`pip install -r ecs_app/requirements.txt`)
- The backend services are built (`make backend-build`)
- The backend services are running (`make backend-up`)
    - if you run `docker ps`, you should see four containers: ecs-app, dynamodb-admin, localstack, and dynamo 
    - to take down the backend, run `make down-all` or `make down-backend`

> **Note:** Tests connect to the backend API running in Docker containers, but pytest itself runs on the host machine.

## Testing Strategy

The test suite focuses on **API integration testing** (smoke tests) that verify:

- Endpoint availability and correct HTTP status codes
- Request/response payload structure and data validation
- End-to-end workflows (e.g., signup → login → create reservation)
- Data persistence across operations
- Error handling and edge cases

Tests use synthetic data and clean up after themselves to avoid polluting shared state. Each test creates temporary users, reservations, and favorites that are deleted after the test completes.

## Available Commands

All backend test commands are defined in the project Makefile and executed from the repository root.

### Run backend tests (no coverage)

```bash
make backend-test
```

Runs the pytest suite with verbose output and full traceback on failures.  
Tests are located in `ecs_app/tests/api/test_urls.py`.

### Run backend tests with coverage

```bash
make backend-test-coverage
```

Runs the pytest suite and generates HTML and terminal coverage reports.  
Coverage reports are saved to `ecs_app/htmlcov/` for detailed analysis.

### Run backend tests without managing Docker stack

```bash
make backend-test-no-stack
```

Runs tests assuming the Docker stack is already running.  
Useful when you've manually started services and want to run tests multiple times.

## Tested APIs

The test suite exercises the following API endpoints. For detailed request/response schemas and payload examples, see [ENDPOINT_SCHEMAS.md](ecs_app/tests/api/ENDPOINT_SCHEMAS.md).

> **Note:** The `ENDPOINT_SCHEMAS.md` file serves as the **source of truth** for API contract documentation. The test suite (`test_urls.py`) uses this documentation to ensure tests align with expected request/response structures. When API contracts change, both the implementation and this schema documentation should be updated to maintain consistency.

### Health Check
- `GET /helloECS` - Health check endpoint

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User authentication
- `PATCH /auth/preferences` - Update user preferences and profile
- `GET /auth/profile/<user_id>` - Get user profile
- `POST /auth/change-password` - Change user password

### Favorites
- `POST /favorites` - Add restaurant to favorites
- `GET /favorites/check` - Check if restaurant is favorited
- `GET /favorites/<user_id>` - List user's favorites
- `DELETE /favorites` - Remove restaurant from favorites

### Reservations
- `POST /reservations/availability` - Check available time slots
- `POST /reservations/hold` - Create temporary reservation hold
- `GET /reservations/hold/active` - Get active hold for user
- `POST /reservations/confirm` - Confirm reservation from hold
- `GET /reservations/user/<user_id>` - List user's reservations
- `GET /reservations/<reservation_id>` - Get reservation details
- `PATCH /reservations/<reservation_id>/modify` - Modify reservation
- `DELETE /reservations/<reservation_id>/cancel` - Cancel reservation

## Coverage

The test suite currently achieves **~84% code coverage** across the backend API codebase.
    - actual 100% coverage of all api endpoints, missing ~16% as the tests cannot cover the test suite itself

### Coverage Requirements

The CI pipeline enforces a minimum coverage threshold of **75%** (configurable via `COVERAGE_MIN` environment variable). This threshold is enforced using pytest's `--cov-fail-under` flag.

Coverage reports include:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

HTML coverage reports are generated in `ecs_app/htmlcov/` and can be viewed locally or downloaded as CI artifacts.

## Test Execution Flow

1. **Setup**: Docker Compose starts DynamoDB Local, LocalStack, and the Django backend
2. **Initialization**: The `local_config` service creates required DynamoDB tables and S3 buckets
3. **Testing**: Pytest executes test cases against the running API
4. **Cleanup**: Tests clean up their own data; Docker stack can be torn down with `make backend-down`

## Notes

- Tests use environment variables to configure endpoints and timeouts
- All tests are designed to be idempotent and isolated
- Test data is created with unique identifiers (UUIDs) to avoid conflicts
- The test suite tracks endpoint coverage automatically and reports missing endpoints

## next step

- test suite for AWS lifecycle/service stability beyond load balancing

