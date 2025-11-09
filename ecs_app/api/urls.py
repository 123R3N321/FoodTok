# api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("helloECS", views.hello_ecs),
    path("insertECS", views.insert_item),
    path("listECS", views.list_items),
    path("uploadECS", views.upload_file),
    path("downloadECS/<str:filename>", views.download_file),

    path("restaurants", views.get_restaurants),
]
