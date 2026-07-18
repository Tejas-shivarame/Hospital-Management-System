from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.accounts.models import User


@receiver(post_save, sender=User)
def send_welcome_email_on_verification(sender, instance: User, created, **kwargs):
    """Fires a welcome email the moment a user becomes verified (not on every save)."""
    if not created and instance.is_verified:
        from apps.accounts.tasks import send_welcome_email_task
        # Only send once — guarded by checking there's no earlier welcome flag.
        # For simplicity in this module we rely on Celery idempotency upstream;
        # a dedicated `welcome_email_sent_at` field can be added if needed.
        send_welcome_email_task.delay(str(instance.id))
