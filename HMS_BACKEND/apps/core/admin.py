from django.contrib import admin
from apps.core.models import Hospital, Branch, Department, AuditLog


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ["name", "registration_number", "city", "subscription_plan", "is_active"]
    list_filter = ["subscription_plan", "is_active", "city", "state"]
    search_fields = ["name", "registration_number", "email"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "hospital", "code", "city", "is_main_branch", "is_active"]
    list_filter = ["is_main_branch", "is_active", "hospital"]
    search_fields = ["name", "code", "city"]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "branch", "hospital", "code", "head_of_department", "is_active"]
    list_filter = ["is_active", "hospital", "branch"]
    search_fields = ["name", "code"]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "user", "hospital", "status_code", "created_at"]
    list_filter = ["method", "status_code"]
    search_fields = ["user__email", "path"]
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False  # audit logs are system-generated only
