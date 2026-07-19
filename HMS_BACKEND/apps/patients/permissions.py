from rest_framework.permissions import BasePermission
from apps.accounts.models import Role


class CanRegisterPatients(BasePermission):
    """Only Receptionist, Hospital Admin, Nurse, or Super Admin may register walk-in patients."""
    message = "You are not permitted to register patients."

    ALLOWED = (Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.RECEPTIONIST, Role.NURSE)

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in self.ALLOWED)


class CanAccessPatientRecord(BasePermission):
    """
    Clinical/administrative staff within the same hospital may view patient
    records; a patient may only view/edit their own. Super Admin sees all.
    """
    message = "You do not have access to this patient's record."

    STAFF_ROLES = (
        Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.DOCTOR, Role.NURSE,
        Role.RECEPTIONIST, Role.LAB_TECHNICIAN, Role.PHARMACIST, Role.ACCOUNTANT,
    )

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == Role.SUPER_ADMIN:
            return True
        if user.role == Role.PATIENT:
            return obj.user_id == user.id
        return user.role in self.STAFF_ROLES and obj.hospital_id == user.hospital_id
