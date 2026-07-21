from django.contrib import admin
from apps.doctors.models import Specialization, Doctor, DoctorAvailability, DoctorTimeOff


@admin.register(Specialization)
class SpecializationAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active"]
    search_fields = ["name"]


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ["user", "hospital", "department", "license_number", "experience_years", "is_available_for_appointments"]
    list_filter = ["hospital", "is_available_for_appointments"]
    search_fields = ["user__first_name", "user__last_name", "license_number"]
    filter_horizontal = ["specializations"]


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ["doctor", "branch", "day_of_week", "start_time", "end_time", "is_active"]
    list_filter = ["day_of_week", "is_active"]


@admin.register(DoctorTimeOff)
class DoctorTimeOffAdmin(admin.ModelAdmin):
    list_display = ["doctor", "start_date", "end_date", "reason"]
