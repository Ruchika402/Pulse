import pytest

from monitors.models import CheckResult, Monitor, Subscription


@pytest.mark.django_db
def test_list_monitors_query_count(client, django_assert_num_queries):
    # Setup data
    visitor_id = "123e4567-e89b-12d3-a456-426614174000"
    monitor = Monitor.objects.create(url="https://example.com", host="example.com")
    Subscription.objects.create(monitor=monitor, visitor_id=visitor_id)
    CheckResult.objects.create(monitor=monitor, ok=True, status_code=200, latency_ms=100)

    # The test: assert that listing monitors takes exactly 1 query (no N+1)
    with django_assert_num_queries(1):
        response = client.get("/api/v1/monitors/", HTTP_X_VISITOR_ID=visitor_id)

    assert response.status_code == 200
    assert len(response.json()) == 1
