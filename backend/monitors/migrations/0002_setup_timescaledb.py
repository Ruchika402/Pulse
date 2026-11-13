from django.db import migrations


def setup_time_series(apps, schema_editor):
    cur = schema_editor.connection.cursor()

    # 1. Check if TimescaleDB is available
    cur.execute("SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'")
    if cur.fetchone():
        cur.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")

        # 2. Turn CheckResult into a hypertable
        cur.execute(
            "SELECT create_hypertable('monitors_checkresult', 'time', "
            "chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE)"
        )

        # 3. Create the continuous aggregate (materialized view)
        cur.execute("""
            CREATE MATERIALIZED VIEW uptime_hourly WITH (timescaledb.continuous) AS
            SELECT time_bucket('1 hour', time) AS bucket, monitor_id,
                   count(*) AS checks, count(*) FILTER (WHERE ok) AS ok_checks,
                   avg(latency_ms)::int AS avg_latency_ms, max(latency_ms) AS max_latency_ms
            FROM monitors_checkresult 
            GROUP BY bucket, monitor_id 
            WITH NO DATA
        """)

        # 4. Add the refresh policy (every 15 minutes)
        cur.execute("""
            SELECT add_continuous_aggregate_policy('uptime_hourly',
                start_offset => INTERVAL '3 hours',
                end_offset => INTERVAL '1 hour',
                schedule_interval => INTERVAL '15 minutes')
        """)

        # 5. Add the retention policy (drop raw rows after 30 days)
        cur.execute("SELECT add_retention_policy('monitors_checkresult', INTERVAL '30 days')")
    else:
        # Fallback for plain Postgres: create a normal table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS uptime_hourly (
                bucket TIMESTAMPTZ NOT NULL,
                monitor_id BIGINT NOT NULL,
                checks INT NOT NULL,
                ok_checks INT NOT NULL,
                avg_latency_ms INT,
                max_latency_ms INT,
                PRIMARY KEY (bucket, monitor_id)
            )
        """)


class Migration(migrations.Migration):
    # Continuous aggregates cannot be created inside a transaction block
    atomic = False

    dependencies = [
        ("monitors", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(setup_time_series, migrations.RunPython.noop),
    ]
