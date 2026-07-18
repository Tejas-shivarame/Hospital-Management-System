from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.accounts.models import Role


class IsSuperAdmin(BasePermission):
    message = "Only Super Admins may perform this action."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.SUPER_ADMIN)


class IsHospitalAdmin(BasePermission):
    message = "Only Hospital Admins may perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN)
        )


class HasRole(BasePermission):
    """
    Generic factory-style permission: HasRole(['doctor', 'nurse'])
    Usage: permission_classes = [HasRole.for_roles(Role.DOCTOR, Role.NURSE)]
    """

    allowed_roles: tuple = ()

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role in self.allowed_roles
        )

    @classmethod
    def for_roles(cls, *roles):
        return type("ScopedHasRole", (cls,), {"allowed_roles": roles})


class IsSameHospital(BasePermission):
    """Object-level: restrict access to records belonging to the requester's own hospital tenant."""
    message = "You do not have access to this hospital's data."

    def has_object_permission(self, request, view, obj):
        if request.user.role == Role.SUPER_ADMIN:
            return True
        obj_hospital = getattr(obj, "hospital", None) or getattr(obj, "hospital_id", None)
        return obj_hospital == request.user.hospital_id or obj_hospital == getattr(request.user, "hospital", None)


class IsOwnerOrStaff(BasePermission):
    """Patients can only touch their own records; staff roles have broader access."""

    STAFF_ROLES = (
        Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.DOCTOR, Role.RECEPTIONIST,
        Role.NURSE, Role.LAB_TECHNICIAN, Role.PHARMACIST, Role.ACCOUNTANT,
    )

    def has_object_permission(self, request, view, obj):
        if request.user.role in self.STAFF_ROLES:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "patient", None)
        return owner == request.user


class ReadOnlyOrHasRole(BasePermission):
    """Allow safe (GET/HEAD/OPTIONS) methods to any authenticated user; writes require a specific role set."""

    allowed_roles: tuple = ()

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in self.allowed_roles

    @classmethod
    def for_roles(cls, *roles):
        return type("ScopedReadOnlyOrHasRole", (cls,), {"allowed_roles": roles})
