from django.db import transaction
from django.db.models import F

from products.models import Product


def restore_stock(order):
    """Puts the quantities of a cancelled order back into stock.

    Stock is reduced when an order is placed, so a cancelled order must give it
    back; otherwise products would stay "sold out" even though nobody bought them.
    Uses F() so concurrent orders cannot overwrite each other's changes.
    """
    with transaction.atomic():
        for item in order.items.all():
            Product.objects.filter(pk=item.product_id).update(stock=F('stock') + item.quantity)
