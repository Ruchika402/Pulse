from django.core.cache import cache
from django.db import DatabaseError, connection
from django.http import JsonResponse
from redis.exceptions import RedisError


def healthz(request):
    return JsonResponse({"status": "ok"})


def readyz(request):
    # Database check
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
    except DatabaseError as e:
        return JsonResponse({"status": "unready", "reason": f"db: {e}"}, status=503)

    # Redis check
    try:
        cache.set("pulse:readyz", "1", timeout=5)
        if cache.get("pulse:readyz") != "1":
            raise RuntimeError("cache round-trip failed")
    except (RedisError, RuntimeError) as e:
        return JsonResponse({"status": "unready", "reason": f"cache: {e}"}, status=503)

    return JsonResponse({"status": "ready"})
