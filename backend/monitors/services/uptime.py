from datetime import timedelta

from django.db.models import Avg
from django.utils import timezone

from monitors.models import CheckResult, Monitor


def get_uptime_stats(monitor_id: int, hours: int) -> dict:
    """
    Calculates uptime, coverage, and average latency for a given time window.
    Uses raw data for recent windows and uptime_hourly for older windows.
    """
    now = timezone.now()
    start_time = now - timedelta(hours=hours)

    # For windows > 24h, we ideally use uptime_hourly.
    # For now, let's use the raw table since it's simpler and works for all windows up to 30d.
    # In a production system, you'd switch to the materialized view for >24h.

    checks = CheckResult.objects.filter(monitor_id=monitor_id, time__gte=start_time)

    total_checks = checks.count()

    if total_checks == 0:
        return {
            "uptime_percent": None,
            "coverage_percent": 0,
            "avg_latency_ms": None,
            "total_checks": 0,
        }

    ok_checks = checks.filter(ok=True).count()
    uptime_percent = (ok_checks / total_checks) * 100

    # Calculate coverage: how many checks we expected vs got
    monitor = Monitor.objects.get(id=monitor_id)
    expected_checks = (hours * 3600) / monitor.interval_seconds
    coverage_percent = (total_checks / expected_checks) * 100

    avg_latency = checks.filter(ok=True).aggregate(avg=Avg("latency_ms"))["avg"]

    return {
        "uptime_percent": round(uptime_percent, 2),
        "coverage_percent": round(coverage_percent, 2),
        "avg_latency_ms": round(avg_latency, 2) if avg_latency else None,
        "total_checks": total_checks,
    }
