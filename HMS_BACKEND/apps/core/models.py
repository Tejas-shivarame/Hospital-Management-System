import uuid
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base: adds UUID pk, created/updated timestamps."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)


class SoftDeleteModel(TimeStampedModel):
    """Abstract base: soft-delete instead of hard delete for audit integrity."""

    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteQuerySet.as_manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False, hard=False):
        if hard:
            return super().delete(using=using, keep_parents=keep_parents)
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])


class Hospital(SoftDeleteModel):
    """A tenant in the multi-hospital system."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    registration_number = models.CharField(max_length=100, unique=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="India")
    postal_code = models.CharField(max_length=20)
    logo = models.ImageField(upload_to="hospitals/logos/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    subscription_plan = models.CharField(
        max_length=20,
        choices=[("trial", "Trial"), ("basic", "Basic"), ("pro", "Pro"), ("enterprise", "Enterprise")],
        default="trial",
    )

    class Meta:
        db_table = "core_hospital"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Branch(SoftDeleteModel):
    """A physical branch/location belonging to a Hospital tenant."""

    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    is_main_branch = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "core_branch"
        unique_together = [("hospital", "code")]
        ordering = ["hospital", "name"]

    def __str__(self):
        return f"{self.hospital.name} — {self.name}"


class AuditLog(models.Model):
    """Immutable audit trail — who did what, when, from where."""

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=255)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "core_audit_log"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["-created_at"]), models.Index(fields=["user", "-created_at"])]

    def __str__(self):
        return f"{self.action} by {self.user} at {self.created_at}"
