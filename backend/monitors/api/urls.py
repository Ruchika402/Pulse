from django.urls import include, path
from rest_framework.routers import DefaultRouter

from monitors.api.views import MonitorViewSet

router = DefaultRouter()
router.register(r"monitors", MonitorViewSet, basename="monitor")

urlpatterns = [
    path("", include(router.urls)),
]
