from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.accounts.models import User, OTP, PasswordResetToken, LoginSession


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["-created_at"]
    list_display = ["email", "first_name", "last_name", "role", "hospital", "is_active", "is_verified"]
    list_filter = ["role", "is_active", "is_verified", "is_2fa_enabled", "hospital"]
    search_fields = ["email", "first_name", "last_name", "phone"]
    readonly_fields = ["id", "created_at", "updated_at", "last_login"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "phone", "avatar", "date_of_birth", "gender", "address")}),
        ("Organization", {"fields": ("role", "hospital", "branch")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser", "is_verified", "is_phone_verified", "is_2fa_enabled")}),
        ("Security", {"fields": ("failed_login_attempts", "locked_until", "last_login_ip")}),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "first_name", "last_name", "role", "password1", "password2")}),
    )
    filter_horizontal = ["groups", "user_permissions"]


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ["user", "purpose", "is_used", "attempts", "expires_at", "created_at"]
    list_filter = ["purpose", "is_used"]
    search_fields = ["user__email"]


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "is_used", "expires_at", "created_at"]
    search_fields = ["user__email"]


@admin.register(LoginSession)
class LoginSessionAdmin(admin.ModelAdmin):
    list_display = ["user", "device_info", "ip_address", "is_active", "last_used_at"]
    list_filter = ["is_active"]
    search_fields = ["user__email"]
