from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from monitors.api.serializers import MonitorSerializer
from monitors.models import Monitor, Subscription
from monitors.services.urlguard import validate_url


class MonitorViewSet(viewsets.ModelViewSet):
    serializer_class = MonitorSerializer
    authentication_classes = []  # No sessions/cookies
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        # Return all monitors for now; we will filter by visitor_id later
        return Monitor.objects.all().order_by("-created_at")

    def create(self, request, *args, **kwargs):
        # 1. Check total caps
        if Monitor.objects.count() >= settings.MAX_MONITORS_TOTAL:
            return Response(
                {"code": "full", "message": "Pulse is full right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        url = serializer.validated_data["url"]

        # 2. One shared monitor per URL
        existing = Monitor.objects.filter(url=url).first()
        if existing:
            return Response(MonitorSerializer(existing).data, status=status.HTTP_200_OK)

        # 3. Create the monitor
        host = validate_url(url).host_header
        monitor = Monitor.objects.create(url=url, host=host)

        # 4. Create the subscription for the visitor
        visitor_id = request.headers.get("X-Visitor-Id")
        if visitor_id:
            Subscription.objects.create(monitor=monitor, visitor_id=visitor_id)

        return Response(MonitorSerializer(monitor).data, status=status.HTTP_201_CREATED)
