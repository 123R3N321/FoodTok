# Frontend Tests

The frontend test suite is powered by **Jest** and is intended to be run **locally on the host machine**, not inside a Docker container.

## Prerequisites

Before running any frontend tests, ensure:

- Node.js and npm are installed
- Frontend dependencies are installed
- `jest` is available via `node_modules` (installed through `npm install`)

> **Note:** These tests are run locally (outside Docker). Jest is not installed or executed inside the container.

## Available Commands

All frontend test commands are defined in the project Makefile and executed from the repository root.

### Run frontend tests (no coverage)

```bash
make frontend-test
```

Runs the Jest test suite once.  
The `--passWithNoTests` flag allows the command to succeed even if no test files are present.

### Run frontend tests with coverage

```bash
make frontend-test-coverage
```

Runs the Jest test suite and generates a coverage report.

Coverage output includes:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

### Run frontend tests in watch mode

```bash
make frontend-test-watch
```

Starts Jest in watch mode for local development.  
Useful when actively writing or debugging tests.

## Notes

- All commands execute from the `FoodTok_Frontend` directory
- These tests are designed for **local developer feedback**, not containerized execution
- Coverage reports are intended to guide testing priorities rather than enforce strict thresholds