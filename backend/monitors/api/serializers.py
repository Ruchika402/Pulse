from asgiref.sync import async_to_sync
from django.core.cache import cache
from rest_framework import serializers

from monitors.models import Monitor
from monitors.services.uptime import get_uptime_stats
from monitors.services.urlguard import SSRFError, validate_url


class MonitorSerializer(serializers.ModelSerializer):
    #uptime_24h = serializers.SerializerMethodField()
    last_check_time = serializers.DateTimeField(read_only=True, required=False)
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
            #"uptime_24h",
            "last_check_time",
        ]
        read_only_fields = [
            "slug",
            "host",
            "interval_seconds",
            "status",
            "status_since",
            "last_viewed_at",
            "created_at",
            "last_check_time"
        ]
        extra_kwargs = {"url": {"validators": []}}  

    #def get_uptime_24h(self, obj):
       # key = f"uptime24h:{obj.id}"
        #val = cache.get(key, "miss")
       # if val == "miss":
       #     val = get_uptime_stats(obj.id, 24)["uptime_percent"]
      #      cache.set(key, val, 30)
       # return val

    def validate_url(self, value):
        try:
            async_to_sync(validate_url)(value)
        except SSRFError as e:
            raise serializers.ValidationError(str(e)) from e
        return value
