"""
Service layer for accounts. Views stay thin; all business logic (token
issuance, OTP lifecycle, notification dispatch) lives here so it's reusable
and independently testable.
"""
import uuid
import pyotp
from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import OTP, PasswordResetToken, LoginSession


# ---------------------------------------------------------------------
# JWT issuance
# ---------------------------------------------------------------------
def issue_tokens_for_user(user, device_info="", ip_address=None):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["hospital_id"] = str(user.hospital_id) if user.hospital_id else None

    LoginSession.objects.create(
        user=user,
        refresh_token_jti=str(refresh["jti"]),
        device_info=device_info[:255],
        ip_address=ip_address,
    )

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ---------------------------------------------------------------------
# OTP lifecycle
# ---------------------------------------------------------------------
def issue_otp(user, purpose):
    OTP.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)
    otp = OTP.objects.create(
        user=user,
        purpose=purpose,
        expires_at=timezone.now() + timezone.timedelta(minutes=settings.OTP_EXPIRY_MINUTES),
    )
    dispatch_otp_notification(user, otp)
    return otp


def verify_otp(user, code, purpose):
    otp = (
        OTP.objects.filter(user=user, purpose=purpose, is_used=False)
        .order_by("-created_at")
        .first()
    )
    if not otp:
        return False, "No active OTP found. Please request a new one."
    if not otp.is_valid():
        return False, "OTP has expired or too many attempts made."
    otp.attempts += 1
    otp.save(update_fields=["attempts"])
    if otp.code != code:
        return False, "Invalid OTP code."
    otp.is_used = True
    otp.save(update_fields=["is_used"])
    return True, "OTP verified successfully."


def dispatch_otp_notification(user, otp):
    from apps.accounts.tasks import send_otp_email_task
    send_otp_email_task.delay(str(user.id), otp.code, otp.purpose)


# ---------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------
def issue_password_reset_token(user):
    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
    token = PasswordResetToken.objects.create(
        user=user,
        expires_at=timezone.now() + timezone.timedelta(hours=1),
    )
    from apps.accounts.tasks import send_password_reset_email_task
    send_password_reset_email_task.delay(str(user.id), str(token.id))
    return token


# ---------------------------------------------------------------------
# Two-Factor Authentication (TOTP, e.g. Google Authenticator)
# ---------------------------------------------------------------------
def generate_totp_secret():
    return pyotp.random_base32()


def get_totp_provisioning_uri(user):
    return pyotp.totp.TOTP(user.totp_secret).provisioning_uri(
        name=user.email, issuer_name="HMS"
    )


def verify_totp_code(user, code):
    totp = pyotp.TOTP(user.totp_secret)
    return totp.verify(code, valid_window=1)
