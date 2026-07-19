from rest_framework.permissions import BasePermission
from apps.accounts.models import Role


class IsSuperAdminForWrite(BasePermission):
    """Only Super Admin may create/delete Hospitals. Everyone authenticated may read (list is still queryset-filtered)."""
    message = "Only a Super Admin may perform this action."

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.SUPER_ADMIN)


class BelongsToRequestersHospital(BasePermission):
    """
    Object-level check for Branch/Department: a Hospital Admin may only
    manage objects under their own hospital tenant. Super Admin bypasses.
    """
    message = "You do not have access to this hospital's data."

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == Role.SUPER_ADMIN:
            return True
        obj_hospital_id = getattr(obj, "hospital_id", None)
        return obj_hospital_id is not None and obj_hospital_id == user.hospital_id


class CanManageBranchesAndDepartments(BasePermission):
    """Hospital Admin (own hospital) or Super Admin (any hospital) may write; others read-only."""
    message = "Only a Hospital Admin or Super Admin may manage branches and departments."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role in (Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN)
