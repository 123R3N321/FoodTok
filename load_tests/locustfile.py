from locust import HttpUser, task, between, LoadTestShape
import logging
import random
import string

logging.basicConfig(level=logging.DEBUG)

class FrontendUser(HttpUser):
    wait_time = between(2, 4)

    def on_start(self):
        """Generate unique user credentials"""
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        self.firstName = f"Test{random_suffix}"
        self.lastName = f"User{random_suffix}"
        self.email = f"testuser_{random_suffix}@test.com"
        self.password = "TestPassword123!"

    @task(1)
    def load_home(self):
        self.client.get("/", name="GET /")

    @task(1)
    def load_login(self):
        self.client.get("/login", name="GET /login")

    @task(2)
    def load_signup(self):
        self.client.get("/signup", name="GET /signup")

    @task(2)
    def load_favorites(self):
        self.client.get("/favorites", name="GET /favorites", catch_response=True)


class LoadTestRampUp(LoadTestShape):
    """
    Ramps up from 1 to 5 users over 15 seconds, then holds for 15 seconds.
    """
    stages = [
        {"duration": 15, "users": 5, "spawn_rate": 0.3},
        {"duration": 15, "users": 5, "spawn_rate": 1},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None