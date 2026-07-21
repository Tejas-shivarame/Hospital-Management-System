from django.db import models
from apps.core.models import TimeStampedModel, SoftDeleteModel


class Specialization(TimeStampedModel):
    """
    Shared reference data across all hospitals (Cardiology, Neurology, ...).
    Global rather than per-hospital so the same list powers doctor search
    across every tenant; a hospital simply may or may not have a doctor in
    a given specialization.
    """

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "doctors_specialization"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Doctor(SoftDeleteModel):
    """
    Clinical profile for a User with role=doctor. Created separately from
    the User/staff-assignment step (Module 2) so a Hospital Admin can first
    create the account, then complete the doctor's professional profile.
    """

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="doctor_profile")
    hospital = models.ForeignKey("core.Hospital", on_delete=models.CASCADE, related_name="doctors")
    branch = models.ForeignKey("core.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="doctors")
    department = models.ForeignKey(
        "core.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="doctors"
    )

    specializations = models.ManyToManyField(Specialization, related_name="doctors", blank=True)
    license_number = models.CharField(max_length=100, unique=True, help_text="Medical council registration number")
    qualification = models.CharField(max_length=255, blank=True, help_text="e.g. MBBS, MD (Cardiology)")
    experience_years = models.PositiveSmallIntegerField(default=0)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    consultation_duration_minutes = models.PositiveSmallIntegerField(default=15)
    bio = models.TextField(blank=True)
    languages_spoken = models.CharField(max_length=255, blank=True, help_text="Comma-separated, e.g. English, Hindi, Kannada")

    is_available_for_appointments = models.BooleanField(default=True)

    class Meta:
        db_table = "doctors_doctor"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["hospital", "is_available_for_appointments"])]

    def __str__(self):
        return f"Dr. {self.user.get_full_name()} ({self.license_number})"


class DayOfWeek(models.IntegerChoices):
    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"
    SUNDAY = 6, "Sunday"


class DoctorAvailability(TimeStampedModel):
    """
    Recurring weekly availability window at a specific branch. A doctor who
    splits time across branches gets one row per (day, branch) combination.
    This is the schedule Module 5 (Appointment Scheduling) will read from
    to generate bookable slots.
    """

    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="availability_slots")
    branch = models.ForeignKey("core.Branch", on_delete=models.CASCADE, related_name="doctor_availability")
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "doctors_availability"
        ordering = ["day_of_week", "start_time"]
        unique_together = [("doctor", "branch", "day_of_week", "start_time")]

    def __str__(self):
        return f"{self.doctor} — {self.get_day_of_week_display()} {self.start_time}-{self.end_time}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("start_time must be before end_time.")


class DoctorTimeOff(TimeStampedModel):
    """A specific date range the doctor is unavailable (leave, conference, etc.), overriding regular availability."""

    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name="time_off")
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "doctors_time_off"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.doctor} off {self.start_date} to {self.end_date}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("start_date must be on or before end_date.")
