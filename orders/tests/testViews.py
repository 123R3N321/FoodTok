# orders/tests/test_views.py
from django.test import SimpleTestCase, Client
from django.urls import reverse

class TestViews(SimpleTestCase):
    def setUp(self):
        self.client = Client()

    def test_index_ok(self):
        resp = self.client.get(reverse("orders-discovery"))
        self.assertEqual(resp.status_code, 200)