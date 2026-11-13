import asyncio
import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import DurationField, ExpressionWrapper, F, Value
from django.db.models.functions import Now

from monitors.models import Monitor
from monitors.services.checker import perform_check, record_result

logger = logging.getLogger(__name__)


def dispatch_due() -> list[int]:
    """
    Claims monitors that are due for a check and moves their next_check_at forward.
    Returns the list of monitor IDs that were claimed.
    """
    with transaction.atomic():
        # Claim up to 200 monitors using skip_locked
        due_monitors = list(
            Monitor.objects.select_for_update(skip_locked=True)
            .filter(active=True, next_check_at__lte=Now())
            .order_by("next_check_at")
            .values_list("id", "interval_seconds", "url")
        )

        if not due_monitors:
            return []

        ids = [m[0] for m in due_monitors]

        # Move the clock forward for the claimed monitors
        Monitor.objects.filter(id__in=ids).update(
            next_check_at=Now()
            + ExpressionWrapper(
                F("interval_seconds") * Value(timedelta(seconds=1)),
                output_field=DurationField(),
            )
        )

    # Fire the checks concurrently outside the transaction
    # For now, we use asyncio.run to block until they finish.
    # Later, Celery will handle this asynchronously.
    for monitor_id, _interval, url in due_monitors:
        try:
            outcome = asyncio.run(perform_check(url))
            record_result(monitor_id, outcome)
        except Exception as e:
            logger.error(f"Check failed for monitor {monitor_id}: {e}")

    return ids
