# this is the DrEam tEam o' 6063 Fall 2025
## our stars are: 
 - Yuxuan Wang
 - Ren
 - Pranjal Mishra
 - Matty Boubin
 - Aaron Bengochea

## Ren's Arbitrary rules:
- we do camel case not snake case

## Project Proposal
[FoodTok Proposal](./FoodTok-FINAL.pdf)

# App Overview 🍴

A skeletal Django-based food ordering application.  
This project is containerized with Docker and managed via a Makefile for a consistent developer experience.

---

## Getting Started

### Prerequisites
- Install [Docker](https://docs.docker.com/get-docker/) (v20+ recommended)
- Install [Docker Compose](https://docs.docker.com/compose/) (built into Docker Desktop / CLI v2)
- You also need GNU `make` 
    - This is installed by default on MacOS/Linux
    - You need to install it on Windows machines

### Setup your local environment
Add environment variables to a file

```bash
touch .env.example
```

Add variables to the file for local environment
```bash
#.env.example
SECRET_KEY='super-secret-key'
DEBUG=1
Allowed_Hosts=127.0.0.1,localhost
```

Copy to .env
```bash
cp .env.example .env
```

### Build and Start the App
```bash
make build
make up
```

Now the app should be up and running on port localhost:8000

Navigate to the service in your browser
```
http://localhost:8000
```
You should see the app running

### Turn off application
```bash
make down
```
Now is you run the docker ps (make ps) command, you won't see any containers running and the app is turned off.