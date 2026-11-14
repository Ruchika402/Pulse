import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

from django.db import close_old_connections, transaction
from django.db.models import DurationField, ExpressionWrapper, F, Value
from django.db.models.functions import Now

from monitors.models import Monitor
from monitors.services.checker import perform_check, record_result

logger = logging.getLogger(__name__)


def run_single_check_sync(monitor_id: int, url: str):
    try:
        # 1. Close any stale DB connections before we start the network request
        close_old_connections()

        # 2. Run HTTP check (Async)
        outcome = asyncio.run(perform_check(url))

        # 3. Close connections again before saving to DB
        close_old_connections()

        # 4. Save to DB & Broadcast
        record_result(monitor_id, outcome)

    except Exception as e:
        logger.error(f"Check failed for monitor {monitor_id}: {e}")
    finally:
        # 5. Ensure the connection is released back to the OS
        close_old_connections()


def dispatch_due() -> list[int]:
    with transaction.atomic():
        due_monitors = list(
            Monitor.objects.select_for_update(skip_locked=True)
            .filter(active=True, next_check_at__lte=Now())
            .order_by("next_check_at")
            .values_list("id", "interval_seconds", "url")
        )

        if not due_monitors:
            return []

        ids = [m[0] for m in due_monitors]

        Monitor.objects.filter(id__in=ids).update(
            next_check_at=Now()
            + ExpressionWrapper(
                F("interval_seconds") * Value(timedelta(seconds=1)),
                output_field=DurationField(),
            )
        )

    # Run checks concurrently in threads
    with ThreadPoolExecutor(max_workers=20) as executor:
        for monitor_id, _interval, url in due_monitors:
            executor.submit(run_single_check_sync, monitor_id, url)

    return ids
