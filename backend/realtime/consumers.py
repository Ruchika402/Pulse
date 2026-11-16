from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.cache import cache
from django.utils import timezone

from monitors.models import CheckResult, Monitor
from realtime.events import snapshot_event


class StatusConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.groups_joined = set()
        await self.accept()

    async def disconnect(self, close_code):
        for group_name in self.groups_joined:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")
        if msg_type in ("subscribe", "resync"):
            await self.handle_subscribe(content)

    async def handle_subscribe(self, content):
        visitor_id = content.get("visitor_id")
        slugs = content.get("slugs", [])[:20]  # Cap at 20

        monitors = await self.get_allowed_monitors(visitor_id, slugs)

        for monitor in monitors:
            # Join the group using the database ID
            group_name = f"mon_{monitor['id']}"

            if group_name not in self.groups_joined:
                await self.channel_layer.group_add(group_name, self.channel_name)
                self.groups_joined.add(group_name)

            # Update last_viewed_at (debounced later, but fine for now)
            await self.update_last_viewed(monitor["id"])

            # Send the snapshot (which contains the slug)
            await self.send_json(monitor["snapshot"])

    @database_sync_to_async
    def get_allowed_monitors(self, visitor_id, slugs):
        allowed = []
        for slug in slugs:
            try:
                monitor = Monitor.objects.get(slug=slug)
            except Monitor.DoesNotExist:
                continue

            # A slug is a public capability — anyone with the slug can see the live status.
            # Management actions (deletion) require the token, handled in the API.
            # This is why we don't strictly check `visitor_id` here for reads.

            cache_key = f"status:{monitor.id}"
            cached_status = cache.get(cache_key)

            if not cached_status:
                cached_status = {
                    "status": monitor.status,
                    "status_since": monitor.status_since.isoformat(),
                }

            points = list(
                CheckResult.objects.filter(monitor=monitor)
                .order_by("-time")
                .values("time", "latency_ms", "ok")[:60]
            )
            points.reverse()
            for p in points:
                p["time"] = p["time"].isoformat()

            snapshot = snapshot_event(
                slug=monitor.slug,
                status=cached_status["status"],
                latency_ms=points[-1]["latency_ms"] if points else None,
                last_60_points=points,
            )
            allowed.append({"id": monitor.id, "snapshot": snapshot})

        return allowed

    @database_sync_to_async
    def update_last_viewed(self, monitor_id):
        Monitor.objects.filter(id=monitor_id).update(last_viewed_at=timezone.now())

    async def monitor_event(self, event):
        # Forward the event to the client
        await self.send_json(event["data"])
