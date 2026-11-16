from asgiref.sync import async_to_sync
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from monitors.api.permissions import HasVisitorId
from monitors.api.serializers import MonitorSerializer
from monitors.models import Monitor, Subscription
from monitors.services.uptime import get_uptime_history, get_uptime_stats
from monitors.services.urlguard import validate_url


class MonitorViewSet(viewsets.ModelViewSet):
    serializer_class = MonitorSerializer
    authentication_classes = []
    permission_classes = [HasVisitorId]
    lookup_field = "slug"

    def get_queryset(self):
        visitor_id = self.request.visitor_id
        return Monitor.objects.filter(subscriptions__visitor_id=visitor_id).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        if Monitor.objects.count() >= settings.MAX_MONITORS_TOTAL:
            return Response(
                {"code": "full", "message": "Pulse is full right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        url = serializer.validated_data["url"]

        existing = Monitor.objects.filter(url=url).first()
        if existing:
            Subscription.objects.get_or_create(monitor=existing, visitor_id=request.visitor_id)
            return Response(MonitorSerializer(existing).data, status=status.HTTP_200_OK)

        safe_url = async_to_sync(validate_url)(url)
        monitor = Monitor.objects.create(url=url, host=safe_url.host_header)

        Subscription.objects.create(monitor=monitor, visitor_id=request.visitor_id)

        return Response(MonitorSerializer(monitor).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()
        Subscription.objects.filter(monitor=instance, visitor_id=request.visitor_id).delete()

        if not instance.subscriptions.exists():
            instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def uptime(self, request, slug=None):
        monitor = self.get_object()
        range_param = request.query_params.get("range", "24h")

        # Map range to hours
        ranges = {"1h": 1, "24h": 24, "30d": 24 * 30, "90d": 24 * 90}
        hours = ranges.get(range_param, 24)

        stats = get_uptime_stats(monitor.id, hours)
        return Response(
            {"monitor_id": monitor.id, "slug": monitor.slug, "range": range_param, **stats}
        )

    @action(detail=True, methods=["get"])
    def history(self, request, slug=None):
        monitor = self.get_object()
        range_param = request.query_params.get("range", "24h")

        ranges = {"1h": 1, "24h": 24, "30d": 24 * 30, "90d": 24 * 90}
        hours = ranges.get(range_param, 24)

        history = get_uptime_history(monitor.id, hours)
        return Response({"slug": monitor.slug, "range": range_param, "buckets": history})

    @action(detail=False, methods=["get"], permission_classes=[])
    def featured(self, request):
        featured_monitors = Monitor.objects.filter(featured=True).order_by("-created_at")
        serializer = self.get_serializer(featured_monitors, many=True)
        return Response(serializer.data)
