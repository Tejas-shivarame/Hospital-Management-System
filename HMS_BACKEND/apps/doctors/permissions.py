from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.accounts.models import Role


class CanManageDoctorProfiles(BasePermission):
    """
    Only Hospital Admin/Super Admin may create doctor profiles or edit
    another doctor's record; a Doctor may reach the write path too, but
    IsSameHospitalOrOwnProfile then restricts them to their own record only.
    Everyone authenticated may browse (read).
    """
    message = "Only a Hospital Admin, Super Admin, or the doctor themself may manage this doctor profile."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.DOCTOR)


class IsSameHospitalOrOwnProfile(BasePermission):
    """Object-level: staff/patients may view doctors within their own hospital; a doctor may always edit their own profile."""
    message = "You do not have access to this doctor's record."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == Role.SUPER_ADMIN:
            return True
        if user.role == Role.DOCTOR and obj.user_id == user.id:
            return True
        if request.method in SAFE_METHODS:
            return obj.hospital_id == user.hospital_id
        return user.role == Role.HOSPITAL_ADMIN and obj.hospital_id == user.hospital_id
