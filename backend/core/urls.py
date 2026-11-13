from django.urls import path
from . import views

urlpatterns = [
    path("health", views.healthz, name="healthz"),
    path("ready", views.readyz, name="readyz"),
]
