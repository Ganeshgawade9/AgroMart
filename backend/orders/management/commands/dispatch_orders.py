import time

from django.core.management.base import BaseCommand

from orders import dispatch


class Command(BaseCommand):
    help = (
        "Expire timed-out delivery offers and (re)assign orders that are still waiting for a rider. "
        "Run once from cron, or keep it running with --interval."
    )

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=int, default=0,
                            help='Seconds between sweeps. 0 (default) runs once and exits.')

    def handle(self, *args, **options):
        interval = options['interval']
        while True:
            expired = dispatch.expire_stale_offers()
            dispatch.retry_waiting_orders()
            self.stdout.write(f'Dispatch sweep done ({expired} expired offer(s) handled).')
            if not interval:
                break
            time.sleep(interval)
