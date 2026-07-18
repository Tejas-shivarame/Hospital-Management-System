import uuid
import random
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.conf import settings


class Role(models.TextChoices):
    SUPER_ADMIN = "super_admin", "Super Admin"
    HOSPITAL_ADMIN = "hospital_admin", "Hospital Admin"
    DOCTOR = "doctor", "Doctor"
    RECEPTIONIST = "receptionist", "Receptionist"
    NURSE = "nurse", "Nurse"
    LAB_TECHNICIAN = "lab_technician", "Lab Technician"
    PHARMACIST = "pharmacist", "Pharmacist"
    ACCOUNTANT = "accountant", "Accountant"
    PATIENT = "patient", "Patient"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", Role.PATIENT)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.SUPER_ADMIN)
        extra_fields.setdefault("is_verified", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user. Email is the login identifier. `role` drives coarse-grained
    RBAC; fine-grained permissions still ride on Django's Permission/Group
    tables so per-action overrides remain possible per hospital.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(unique=True, db_index=True)
    phone = models.CharField(max_length=20, blank=True, db_index=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.PATIENT, db_index=True)

    hospital = models.ForeignKey(
        "core.Hospital", on_delete=models.SET_NULL, null=True, blank=True, related_name="users"
    )
    branch = models.ForeignKey(
        "core.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="users"
    )

    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10, choices=[("male", "Male"), ("female", "Female"), ("other", "Other")], blank=True
    )
    address = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)  # email verified
    is_phone_verified = models.BooleanField(default=False)

    # Two-Factor Authentication
    is_2fa_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=64, blank=True)

    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "accounts_user"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["role", "hospital"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    @property
    def is_locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())

    def register_failed_login(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.locked_until = timezone.now() + timezone.timedelta(minutes=15)
        self.save(update_fields=["failed_login_attempts", "locked_until"])

    def reset_failed_login(self):
        if self.failed_login_attempts or self.locked_until:
            self.failed_login_attempts = 0
            self.locked_until = None
            self.save(update_fields=["failed_login_attempts", "locked_until"])


def generate_otp_code(length=6):
    return "".join(str(random.randint(0, 9)) for _ in range(length))


class OTP(models.Model):
    """One-time passcode for email/phone verification, login 2FA, and password reset."""

    class Purpose(models.TextChoices):
        EMAIL_VERIFICATION = "email_verification", "Email Verification"
        PHONE_VERIFICATION = "phone_verification", "Phone Verification"
        LOGIN_2FA = "login_2fa", "Login 2FA"
        PASSWORD_RESET = "password_reset", "Password Reset"

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otps")
    code = models.CharField(max_length=8, default=generate_otp_code)
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_otp"
        indexes = [models.Index(fields=["user", "purpose", "is_used"])]

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now() and self.attempts < 5

    def __str__(self):
        return f"OTP({self.purpose}) for {self.user.email}"


class PasswordResetToken(models.Model):
    """Opaque single-use token used in the reset-password email link."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reset_tokens")
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_password_reset_token"

    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()


class LoginSession(models.Model):
    """Tracks active refresh-token sessions per device for session management / force-logout."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    refresh_token_jti = models.CharField(max_length=255, db_index=True)
    device_info = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "accounts_login_session"
        ordering = ["-last_used_at"]
