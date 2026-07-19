from rest_framework import viewsets, generics, status, permissions as drf_permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.models import Hospital, Branch, Department
from apps.core.serializers import (
    HospitalSerializer, HospitalWithAdminSerializer, BranchSerializer,
    DepartmentSerializer, StaffAssignSerializer,
)
from apps.core.permissions import (
    IsSuperAdminForWrite, BelongsToRequestersHospital, CanManageBranchesAndDepartments,
)
from apps.core.services import dispatch_hospital_admin_welcome, dispatch_staff_welcome
from apps.accounts.models import Role
from apps.accounts.serializers import UserSerializer


def envelope(success, message, data=None, status_code=status.HTTP_200_OK):
    return Response({"success": success, "message": message, "data": data}, status=status_code)


class HospitalViewSet(viewsets.ModelViewSet):
    """
    /api/v1/core/hospitals/
    Super Admin: full CRUD across every hospital (tenant onboarding).
    Hospital Admin / staff / patients: read-only, scoped to their own hospital.
    """
    serializer_class = HospitalSerializer
    permission_classes = [IsSuperAdminForWrite]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active", "subscription_plan", "city", "state"]
    search_fields = ["name", "registration_number", "email", "city"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        qs = Hospital.objects.filter(is_deleted=False)
        user = self.request.user
        if user.role == Role.SUPER_ADMIN:
            return qs
        return qs.filter(id=user.hospital_id) if user.hospital_id else qs.none()

    def perform_destroy(self, instance):
        instance.delete()  # soft delete

    @action(detail=False, methods=["post"], url_path="onboard")
    def onboard(self, request):
        """
        One-shot tenant onboarding: creates Hospital + main Branch + first
        Hospital Admin user, transactionally. Super Admin only.
        """
        if request.user.role != Role.SUPER_ADMIN:
            return envelope(False, "Only a Super Admin may onboard a new hospital.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = HospitalWithAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        dispatch_hospital_admin_welcome(result["admin"], result["hospital"])

        return envelope(
            True,
            "Hospital onboarded successfully.",
            {
                "hospital": HospitalSerializer(result["hospital"]).data,
                "main_branch": BranchSerializer(result["main_branch"]).data,
                "admin": UserSerializer(result["admin"]).data,
            },
            status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Hospitals retrieved.", response.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return envelope(True, "Hospital retrieved.", self.get_serializer(instance).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return envelope(True, "Hospital created.", serializer.data, status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return envelope(True, "Hospital updated.", serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return envelope(True, "Hospital deactivated.")


class BranchViewSet(viewsets.ModelViewSet):
    """
    /api/v1/core/branches/?hospital=<id>
    Hospital Admin manages branches within their own hospital; Super Admin manages any.
    """
    serializer_class = BranchSerializer
    permission_classes = [CanManageBranchesAndDepartments, BelongsToRequestersHospital]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["hospital", "is_active", "city"]
    search_fields = ["name", "code", "city"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        qs = Branch.objects.filter(is_deleted=False)
        user = self.request.user
        if user.role == Role.SUPER_ADMIN:
            return qs
        return qs.filter(hospital_id=user.hospital_id) if user.hospital_id else qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        hospital = serializer.validated_data.get("hospital")
        if user.role != Role.SUPER_ADMIN:
            hospital = user.hospital  # non-super-admins can only create within their own hospital
        serializer.save(hospital=hospital)

    def perform_destroy(self, instance):
        instance.delete()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Branches retrieved.", response.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return envelope(True, "Branch retrieved.", self.get_serializer(instance).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return envelope(True, "Branch created.", serializer.data, status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return envelope(True, "Branch updated.", serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        self.perform_destroy(instance)
        return envelope(True, "Branch deactivated.")


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    /api/v1/core/departments/?branch=<id>&hospital=<id>
    Hospital Admin manages departments within their own hospital; Super Admin manages any.
    """
    serializer_class = DepartmentSerializer
    permission_classes = [CanManageBranchesAndDepartments, BelongsToRequestersHospital]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["hospital", "branch", "is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        qs = Department.objects.filter(is_deleted=False)
        user = self.request.user
        if user.role == Role.SUPER_ADMIN:
            return qs
        return qs.filter(hospital_id=user.hospital_id) if user.hospital_id else qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        branch = serializer.validated_data["branch"]
        hospital = branch.hospital if user.role == Role.SUPER_ADMIN else user.hospital
        if user.role != Role.SUPER_ADMIN and branch.hospital_id != user.hospital_id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You may only create departments within your own hospital's branches.")
        serializer.save(hospital=hospital)

    def perform_destroy(self, instance):
        instance.delete()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Departments retrieved.", response.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return envelope(True, "Department retrieved.", self.get_serializer(instance).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return envelope(True, "Department created.", serializer.data, status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return envelope(True, "Department updated.", serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        self.perform_destroy(instance)
        return envelope(True, "Department deactivated.")


class StaffAssignView(APIView):
    """
    POST /api/v1/core/staff/assign/
    Hospital Admin assigns/creates a staff member within their own hospital.
    Super Admin may target any hospital by passing `hospital` in the body.
    """
    permission_classes = [drf_permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in (Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN):
            return envelope(False, "Only a Hospital Admin or Super Admin may assign staff.", status_code=status.HTTP_403_FORBIDDEN)

        hospital = request.user.hospital
        if request.user.role == Role.SUPER_ADMIN:
            hospital_id = request.data.get("hospital")
            if not hospital_id:
                return envelope(False, "hospital is required for Super Admin staff assignment.", status_code=status.HTTP_400_BAD_REQUEST)
            hospital = Hospital.objects.filter(id=hospital_id, is_deleted=False).first()
            if not hospital:
                return envelope(False, "Hospital not found.", status_code=status.HTTP_404_NOT_FOUND)

        if not hospital:
            return envelope(False, "You are not assigned to a hospital.", status_code=status.HTTP_400_BAD_REQUEST)

        serializer = StaffAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        branch = serializer.validated_data["branch"]
        if branch.hospital_id != hospital.id:
            return envelope(False, "That branch does not belong to this hospital.", status_code=status.HTTP_400_BAD_REQUEST)

        user = serializer.save(hospital=hospital)
        dispatch_staff_welcome(user)

        return envelope(True, "Staff member assigned successfully.", UserSerializer(user).data, status.HTTP_201_CREATED)
