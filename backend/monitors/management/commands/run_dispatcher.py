import time

from django.core.management.base import BaseCommand

from monitors.services.scheduler import dispatch_due


class Command(BaseCommand):
    help = "Continuously run the dispatcher every 5 seconds"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Dispatcher loop started"))
        while True:
            try:
                ids = dispatch_due()
                if ids:
                    self.stdout.write(f"Dispatched {len(ids)} checks")
            except Exception as e:
                self.stderr.write(f"Dispatcher error: {e}")
            time.sleep(5)
