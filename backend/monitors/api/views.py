from django.conf import settings
from django.db.models import OuterRef, Subquery
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from monitors.api.permissions import HasVisitorId
from monitors.api.serializers import MonitorSerializer
from monitors.models import CheckResult, Monitor, Subscription
from monitors.services.uptime import get_uptime_stats
from monitors.services.urlguard import validate_url


class MonitorViewSet(viewsets.ModelViewSet):
    serializer_class = MonitorSerializer
    authentication_classes = []  # No sessions/cookies
    permission_classes = [HasVisitorId]
    lookup_field = "slug"

    def get_queryset(self):
        visitor_id = self.request.visitor_id

        # Get the latest check for each monitor
        latest_check = CheckResult.objects.filter(monitor=OuterRef("pk")).order_by("-time")

        return (
            Monitor.objects.filter(subscriptions__visitor_id=visitor_id)
            .annotate(
                latest_status_code=Subquery(latest_check.values("status_code")[:1]),
                latest_latency=Subquery(latest_check.values("latency_ms")[:1]),
            )
            .order_by("-created_at")
        )

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
            # Subscribe this visitor if they aren't already
            Subscription.objects.get_or_create(monitor=existing, visitor_id=request.visitor_id)
            return Response(MonitorSerializer(existing).data, status=status.HTTP_200_OK)

        # 3. Create the monitor
        host = validate_url(url).host_header
        monitor = Monitor.objects.create(url=url, host=host)

        # 4. Create the subscription for the visitor
        Subscription.objects.create(monitor=monitor, visitor_id=request.visitor_id)

        return Response(MonitorSerializer(monitor).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        # Only allow deleting the subscription, not the monitor itself.
        # The monitor stops when nobody is left.
        instance = self.get_object()
        Subscription.objects.filter(monitor=instance, visitor_id=request.visitor_id).delete()

        # Check if monitor has any subscriptions left
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
