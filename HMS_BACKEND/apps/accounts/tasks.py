import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


logger = logging.getLogger("apps.accounts")


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_otp_email_task(self, user_id, code, purpose):
    from apps.accounts.models import User
    try:
        user = User.objects.get(id=user_id)
        subject_map = {
            "email_verification": "Verify your email",
            "phone_verification": "Verify your phone number",
            "login_2fa": "Your login verification code",
            "password_reset": "Your password reset code",
        }
        subject = subject_map.get(purpose, "Your verification code")
        message = f"Your OTP code is {code}. It expires in {settings.OTP_EXPIRY_MINUTES} minutes."
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        logger.info(f"OTP email sent to {user.email} for {purpose}")
    except Exception as exc:
        logger.exception("Failed to send OTP email")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_password_reset_email_task(self, user_id, token_id):
    from apps.accounts.models import User
    try:
        user = User.objects.get(id=user_id)
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token_id}"
        message = f"Reset your password using this link (valid for 1 hour): {reset_link}"
        send_mail("Reset your HMS password", message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        logger.info(f"Password reset email sent to {user.email}")
    except Exception as exc:
        logger.exception("Failed to send password reset email")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_welcome_email_task(self, user_id):
    from apps.accounts.models import User
    try:
        user = User.objects.get(id=user_id)
        message = f"Welcome to HMS, {user.get_full_name()}! Your account has been created as a {user.get_role_display()}."
        send_mail("Welcome to HMS", message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
    except Exception as exc:
        logger.exception("Failed to send welcome email")
        raise self.retry(exc=exc)
