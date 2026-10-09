from .models import Notification


def send_notification(user, notification_type, message, order_id=None):
    Notification.objects.create(
        user=user,
        notification_type=notification_type,
        message=message,
        order_id=order_id
    )
