from django.core.management.base import BaseCommand

from monitors.services.scheduler import dispatch_due


class Command(BaseCommand):
    help = "Run the dispatcher once"

    def handle(self, *args, **options):
        ids = dispatch_due()
        self.stdout.write(self.style.SUCCESS(f"Dispatched {len(ids)} checks"))
