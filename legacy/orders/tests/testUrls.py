# orders/tests/test_urls.py
from django.test import SimpleTestCase
from django.urls import reverse, resolve
from orders import views

class TestURLRouting(SimpleTestCase):
    def test_orders_index_url_resolves(self):
        url = reverse("orders-discovery")  # assumes you named a URL 'index'
        match = resolve(url)
        self.assertEqual(match.func, views.home)  # if function-based view