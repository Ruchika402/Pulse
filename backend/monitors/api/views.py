from datetime import timedelta
from urllib.parse import urlparse

from django.conf import settings
from django.db.models import OuterRef
from django.db.models import Avg, Count, Q, Subquery
from django.db.models.functions import TruncDay, TruncHour
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from monitors.api.permissions import HasVisitorId
from monitors.api.serializers import MonitorSerializer
from monitors.models import CheckResult, Monitor, Subscription
from monitors.services.uptime import get_uptime_history, get_uptime_stats


class MonitorViewSet(viewsets.ModelViewSet):
    serializer_class = MonitorSerializer
    authentication_classes = []
    permission_classes = [HasVisitorId]
    lookup_field = "slug"

    def get_queryset(self):
        visitor_id = self.request.visitor_id
        latest_check = CheckResult.objects.filter(monitor=OuterRef("pk")).order_by("-time")
        return Monitor.objects.filter(subscriptions__visitor_id=visitor_id).annotate(last_check_time=Subquery(latest_check.values("time")[:1])).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        if Monitor.objects.count() >= settings.MAX_MONITORS_TOTAL:
            return Response(
                {"code": "full", "message": "Pulse is full right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        url = serializer.validated_data["url"]
        parsed_url = urlparse(url)
        host = parsed_url.hostname.lower() if parsed_url.hostname else ""
        existing = Monitor.objects.filter(url=url).first()
        if existing:
            Subscription.objects.get_or_create(monitor=existing, visitor_id=request.visitor_id)
            return Response(MonitorSerializer(existing).data, status=status.HTTP_200_OK)

        monitor = Monitor.objects.create(
            url=url, host=host, interval_seconds=settings.DEFAULT_INTERVAL
        )

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

    @action(detail=True, methods=["get"])
    def checks(self, request, slug=None):
        monitor = self.get_object()
        rng = request.query_params.get("range", "1h")
        hours = {"1h": 1, "24h": 24, "30d": 720, "90d": 2160}.get(rng, 1)
        start = timezone.now() - timedelta(hours=hours)
        qs = CheckResult.objects.filter(monitor=monitor, time__gte=start)

        if hours <= 24:
            data = [
                {"time": r["time"].isoformat(), "latency_ms": r["latency_ms"], "ok": r["ok"]}
                for r in qs.order_by("time").values("time", "latency_ms", "ok")
            ]
        else:
            trunc = TruncHour if hours <= 720 else TruncDay
            rows = (
                qs.annotate(b=trunc("time"))
                .values("b")
                .annotate(
                    lat=Avg("latency_ms", filter=Q(ok=True)),
                    fails=Count("time", filter=Q(ok=False)),
                )
                .order_by("b")
            )
            data = [
                {
                    "time": r["b"].isoformat(),
                    "latency_ms": round(r["lat"]) if r["lat"] is not None else None,
                    "ok": r["fails"] == 0,
                }
                for r in rows
            ]
        return Response({"slug": monitor.slug, "range": rng, "checks": data})
