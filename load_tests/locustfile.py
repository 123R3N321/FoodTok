from locust import HttpUser, task, between, LoadTestShape
import logging
import random

logging.basicConfig(level=logging.DEBUG)

class FrontendUser(HttpUser):
    wait_time = between(0.5, 1)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.restaurant_ids = [str(i) for i in range(1, 51)]

    @task(2)
    def load_home(self):
        self.client.get("/", name="GET /")

    @task(2)
    def load_login(self):
        self.client.get("/login", name="GET /login")

    @task(2)
    def load_signup(self):
        self.client.get("/signup", name="GET /signup")

    @task(3)
    def load_history(self):
        self.client.get("/history", name="GET /history")

    @task(4)
    def load_restaurant_detail(self):
        restaurant_id = random.choice(self.restaurant_ids)
        self.client.get(f"/restaurant/{restaurant_id}", name="GET /restaurant/<id>")

    @task(1)
    def load_favorites(self):
        self.client.get("/favorites", name="GET /favorites")

    @task(1)
    def load_profile(self):
        self.client.get("/profile", name="GET /profile")

    @task(1)
    def load_settings(self):
        self.client.get("/settings", name="GET /settings")


class LoadTestRampUp(LoadTestShape):
    """
    Ramps up from 1 to 200 users over 60 seconds, holds for 120 seconds.
    """
    stages = [
        {"duration": 60, "users": 200, "spawn_rate": 3},
        {"duration": 120, "users": 200, "spawn_rate": 1},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None