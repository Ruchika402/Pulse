from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache


def healthz(request):
    return JsonResponse({"status": "ok"})


def readyz(request):
    # Database
    try:
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
    except Exception as e:
        return JsonResponse({"status": "unready", "reason": f"db: {e}"}, status=503)

    # Redis
    try:
        cache.set("pulse:readyz", "1", timeout=5)
        if cache.get("pulse:readyz") != "1":
            raise RuntimeError("cache round-trip failed")
    except Exception as e:
        return JsonResponse({"status": "unready", "reason": f"cache: {e}"}, status=503)

    return JsonResponse({"status": "ready"})
