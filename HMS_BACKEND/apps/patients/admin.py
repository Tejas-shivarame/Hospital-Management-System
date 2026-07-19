from django.contrib import admin
from apps.patients.models import Patient, PatientDocument


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ["mrn", "user", "hospital", "branch", "blood_group", "created_at"]
    list_filter = ["hospital", "blood_group"]
    search_fields = ["mrn", "user__first_name", "user__last_name", "user__email"]
    readonly_fields = ["mrn"]


@admin.register(PatientDocument)
class PatientDocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "patient", "document_type", "uploaded_by", "created_at"]
    list_filter = ["document_type"]
    search_fields = ["title", "patient__mrn"]
