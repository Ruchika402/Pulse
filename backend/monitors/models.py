# Create your models here.
import secrets

from django.db import models
from django.db.models.functions import Now
from django.utils import timezone


def generate_slug():
    return secrets.token_urlsafe(8)


class Monitor(models.Model):
    class Status(models.TextChoices):
        UNKNOWN = "unknown", "Unknown"
        UP = "up", "Up"
        DOWN = "down", "Down"

    slug = models.CharField(max_length=16, unique=True, default=generate_slug)
    url = models.URLField(max_length=2048, unique=True)
    host = models.CharField(max_length=255)

    interval_seconds = models.PositiveIntegerField(default=60)
    active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)

    next_check_at = models.DateTimeField(default=timezone.now)

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.UNKNOWN)
    status_since = models.DateTimeField(default=timezone.now)
    consecutive_failures = models.PositiveIntegerField(default=0)

    seq = models.PositiveIntegerField(default=0)
    version = models.PositiveIntegerField(default=0)

    last_viewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["next_check_at"],
                name="idx_active_next_check",
                condition=models.Q(active=True),
            )
        ]

    def __str__(self):
        return f"{self.url} ({self.status})"


class Subscription(models.Model):
    monitor = models.ForeignKey(Monitor, on_delete=models.CASCADE, related_name="subscriptions")
    visitor_id = models.UUIDField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["monitor", "visitor_id"], name="unique_monitor_visitor")
        ]

    def __str__(self):
        return f"{self.visitor_id} -> {self.monitor.slug}"


class CheckResult(models.Model):
    class ErrorKind(models.TextChoices):
        TIMEOUT = "timeout", "Timeout"
        DNS = "dns", "DNS Error"
        TLS = "tls", "TLS Error"
        CONNECT = "connect", "Connection Error"
        BLOCKED = "blocked", "Blocked (SSRF)"
        HTTP_5XX = "http_5xx", "5xx Error"
        OTHER = "other", "Other Error"

    # Django 5.2 Composite Primary Key (required for TimescaleDB)
    pk = models.CompositePrimaryKey("monitor", "time")

    monitor = models.ForeignKey(Monitor, on_delete=models.CASCADE, related_name="checks")
    time = models.DateTimeField(db_default=Now())  # DB clock, avoids worker skew

    ok = models.BooleanField()
    status_code = models.PositiveIntegerField(null=True, blank=True)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)

    error_kind = models.CharField(max_length=16, choices=ErrorKind.choices, null=True, blank=True)
    http_version = models.CharField(max_length=16, null=True, blank=True)
    checked_by = models.CharField(max_length=64, null=True, blank=True)

    def __str__(self):
        return f"{self.monitor_id} at {self.time} - {'OK' if self.ok else 'Fail'}"


class UptimeHourly(models.Model):
    bucket = models.DateTimeField()
    monitor = models.ForeignKey(Monitor, on_delete=models.DO_NOTHING, db_column="monitor_id")
    checks = models.IntegerField()
    ok_checks = models.IntegerField()
    avg_latency_ms = models.IntegerField()
    max_latency_ms = models.IntegerField()

    class Meta:
        managed = False
        db_table = "uptime_hourly"

    def __str__(self):
        return f"{self.monitor_id} @ {self.bucket}"


class BlockedHost(models.Model):
    host = models.CharField(max_length=255, unique=True)
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.host
