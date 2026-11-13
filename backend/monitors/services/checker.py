import time
from dataclasses import dataclass

import httpx
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from monitors.models import CheckResult, Monitor
from monitors.services.urlguard import SSRFError, validate_url
from realtime.events import check_event, status_change_event


@dataclass
class CheckOutcome:
    ok: bool
    status_code: int | None
    latency_ms: int | None
    error_kind: str | None
    http_version: str | None


async def perform_check(url: str) -> CheckOutcome:
    try:
        safe_url = validate_url(url)
    except SSRFError:
        return CheckOutcome(False, None, None, "blocked", None)

    start = time.monotonic()
    transport = httpx.AsyncHTTPTransport(local_address=safe_url.resolved_ip)
    headers = {
        "User-Agent": "PulsePortfolioBot/1.0 (+https://github.com/Ruchika402/Pulse)",
        "Host": safe_url.host_header,
    }

    try:
        async with httpx.AsyncClient(
            transport=transport,
            timeout=httpx.Timeout(10.0, connect=5.0),
            follow_redirects=False,
        ) as client:
            ext = {"sni_hostname": safe_url.host_header} if safe_url.is_https else {}
            response = await client.get(safe_url.original_url, headers=headers, extensions=ext)
            latency_ms = int((time.monotonic() - start) * 1000)
            http_version = response.http_version
            ok = 200 <= response.status_code < 400

            error_kind = None
            if not ok:
                if response.status_code >= 500:
                    error_kind = "http_5xx"
                else:
                    error_kind = "other"

            return CheckOutcome(
                ok=ok,
                status_code=response.status_code,
                latency_ms=latency_ms,
                error_kind=error_kind,
                http_version=http_version,
            )

    except httpx.TimeoutException:
        return CheckOutcome(False, None, None, "timeout", None)
    except httpx.ConnectError:
        return CheckOutcome(False, None, None, "connect", None)
    except Exception:
        return CheckOutcome(False, None, None, "other", None)


def record_result(monitor_id: int, outcome: CheckOutcome):
    channel_layer = get_channel_layer()
    event_data = None
    status_change_data = None

    with transaction.atomic():
        monitor = Monitor.objects.select_for_update().get(id=monitor_id)

        # 1. Save the CheckResult
        CheckResult.objects.create(
            monitor=monitor,
            ok=outcome.ok,
            status_code=outcome.status_code,
            latency_ms=outcome.latency_ms,
            error_kind=outcome.error_kind,
            http_version=outcome.http_version,
            checked_by="local-worker",
        )

        # 2. Determine new status & handle optimistic locking
        new_status = Monitor.Status.UP if outcome.ok else Monitor.Status.DOWN
        old_status = monitor.status

        # Only flip if status actually changed
        if old_status != new_status:
            monitor.status = new_status
            monitor.status_since = timezone.now()

            # Fire the status_change event
            status_change_data = status_change_event(
                monitor_id=monitor.id,
                seq=monitor.seq + 1,
                from_status=old_status,
                to_status=new_status,
                since=monitor.status_since.isoformat(),
            )

        if outcome.ok:
            monitor.consecutive_failures = 0
        else:
            monitor.consecutive_failures += 1

        monitor.version = F("version") + 1
        monitor.seq = F("seq") + 1
        monitor.next_check_at = timezone.now() + timezone.timedelta(
            seconds=monitor.interval_seconds
        )
        monitor.save()

        # 3. Prepare the check event
        event_data = check_event(
            monitor_id=monitor.id,
            seq=monitor.seq,
            time=timezone.now().isoformat(),
            ok=outcome.ok,
            status_code=outcome.status_code,
            latency_ms=outcome.latency_ms,
            error_kind=outcome.error_kind,
        )

    # 4. Publish to the group (Outside the transaction)
    if event_data:
        async_to_sync(channel_layer.group_send)(
            f"mon_{monitor_id}", {"type": "monitor.event", "data": event_data}
        )
    if status_change_data:
        async_to_sync(channel_layer.group_send)(
            f"mon_{monitor_id}", {"type": "monitor.event", "data": status_change_data}
        )
