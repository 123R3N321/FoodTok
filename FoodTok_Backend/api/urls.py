# api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Health check endpoint
    path("helloECS", views.hello_ecs, name="hello-ecs"),
    
    # Auth endpoints
    path("auth/login", views.login, name="auth-login"),
    path("auth/signup", views.signup, name="auth-signup"),
    path("auth/preferences", views.update_preferences, name="auth-preferences"),
    path("auth/profile/<str:user_id>", views.get_profile, name="auth-profile"),
    path("auth/change-password", views.change_password, name="auth-change-password"),
    
    # Favorites endpoints
    path("favorites/check", views.check_favorite, name="favorites-check"),
    path("favorites/<str:user_id>", views.get_favorites, name="favorites-list"),
    path("favorites", views.favorites_handler, name="favorites-add"),
    
    # Reservation endpoints
    path("reservations/availability", views.check_availability, name="reservation-availability"),
    path("reservations/hold", views.create_hold, name="reservation-hold"),
    path("reservations/hold/active", views.get_active_hold, name="reservation-active-hold"),
    path("reservations/confirm", views.confirm_reservation, name="reservation-confirm"),
    path("reservations/user/<str:user_id>", views.get_user_reservations, name="reservation-user-list"),
    path("reservations/<str:reservation_id>", views.get_reservation, name="reservation-detail"),
    path("reservations/<str:reservation_id>/modify", views.modify_reservation, name="reservation-modify"),
    path("reservations/<str:reservation_id>/cancel", views.cancel_reservation, name="reservation-cancel"),
]
