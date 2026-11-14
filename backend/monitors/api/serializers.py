from rest_framework import serializers

from monitors.models import Monitor
from monitors.services.urlguard import SSRFError, validate_url


class MonitorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Monitor
        fields = [
            "slug",
            "url",
            "host",
            "interval_seconds",
            "status",
            "status_since",
            "last_viewed_at",
            "created_at",
        ]

        read_only_fields = [
            "slug",
            "host",
            "status",
            "status_since",
            "last_viewed_at",
            "created_at",
        ]

    def validate_url(self, value):
        try:
            validate_url(value)
        except SSRFError as e:
            raise serializers.ValidationError(str(e)) from e
        return value
