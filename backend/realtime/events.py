def check_event(slug, seq, time, ok, status_code, latency_ms, error_kind):
    return {
        "type": "check",
        "slug": slug,
        "seq": seq,
        "time": time,
        "ok": ok,
        "status_code": status_code,
        "latency_ms": latency_ms,
        "error_kind": error_kind,
    }


def status_change_event(slug, seq, from_status, to_status, since):
    return {
        "type": "status_change",
        "slug": slug,
        "seq": seq,
        "from": from_status,
        "to": to_status,
        "since": since,
    }


def snapshot_event(slug, status, latency_ms, last_60_points):
    return {
        "type": "snapshot",
        "slug": slug,
        "status": status,
        "latency_ms": latency_ms,
        "points": last_60_points,
    }


def notice_event(code, message):
    return {
        "type": "notice",
        "code": code,
        "message": message,
    }
