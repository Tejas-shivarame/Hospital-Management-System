from rest_framework import viewsets, status, permissions as drf_permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.doctors.models import Specialization, Doctor, DoctorAvailability, DoctorTimeOff
from apps.doctors.serializers import (
    SpecializationSerializer, DoctorSerializer, DoctorProfileUpdateSerializer,
    DoctorProfileCreateSerializer, DoctorAvailabilitySerializer, DoctorTimeOffSerializer,
)
from apps.doctors.permissions import CanManageDoctorProfiles, IsSameHospitalOrOwnProfile
from apps.accounts.models import Role


def envelope(success, message, data=None, status_code=status.HTTP_200_OK):
    return Response({"success": success, "message": message, "data": data}, status=status_code)


class SpecializationViewSet(viewsets.ModelViewSet):
    """/api/v1/doctors/specializations/ — global reference data. Read: anyone authenticated. Write: Super Admin only."""
    serializer_class = SpecializationSerializer
    queryset = Specialization.objects.all()
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name"]

    def get_permissions(self):
        if self.request.method not in ("GET", "HEAD", "OPTIONS"):
            from apps.accounts.permissions import IsSuperAdmin
            return [IsSuperAdmin()]
        return [drf_permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Specializations retrieved.", response.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return envelope(True, "Specialization created.", serializer.data, status.HTTP_201_CREATED)


class DoctorProfileCreateView(APIView):
    """POST /api/v1/doctors/profiles/ — Hospital Admin completes the clinical profile for an existing doctor-role User."""
    permission_classes = [drf_permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in (Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN):
            return envelope(False, "Only a Hospital Admin or Super Admin may create doctor profiles.", status_code=status.HTTP_403_FORBIDDEN)

        hospital = request.user.hospital
        if request.user.role == Role.SUPER_ADMIN:
            hospital_id = request.data.get("hospital")
            if not hospital_id:
                return envelope(False, "hospital is required for Super Admin.", status_code=status.HTTP_400_BAD_REQUEST)
            from apps.core.models import Hospital
            hospital = Hospital.objects.filter(id=hospital_id, is_deleted=False).first()
            if not hospital:
                return envelope(False, "Hospital not found.", status_code=status.HTTP_404_NOT_FOUND)

        if not hospital:
            return envelope(False, "You are not assigned to a hospital.", status_code=status.HTTP_400_BAD_REQUEST)

        serializer = DoctorProfileCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doctor = serializer.save(hospital=hospital)
        return envelope(True, "Doctor profile created.", DoctorSerializer(doctor).data, status.HTTP_201_CREATED)


class DoctorViewSet(viewsets.ModelViewSet):
    """
    /api/v1/doctors/?hospital=<id>&specializations=<id>&department=<id>
    Browsable by any authenticated user (patients browse doctors to book
    with, staff look doctors up); scoped to hospital for non-Super-Admins.
    Creation happens through DoctorProfileCreateView, not POST here.
    """
    serializer_class = DoctorSerializer
    http_method_names = ["get", "patch", "head", "options"]
    permission_classes = [drf_permissions.IsAuthenticated, CanManageDoctorProfiles, IsSameHospitalOrOwnProfile]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["hospital", "branch", "department", "is_available_for_appointments", "specializations"]
    search_fields = ["user__first_name", "user__last_name", "license_number", "qualification"]
    ordering_fields = ["experience_years", "consultation_fee", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Doctor.objects.filter(is_deleted=False).select_related("user", "hospital", "branch", "department").prefetch_related("specializations")
        if user.role == Role.SUPER_ADMIN:
            return qs
        return qs.filter(hospital_id=user.hospital_id) if user.hospital_id else qs.none()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Doctors retrieved.", response.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return envelope(True, "Doctor retrieved.", self.get_serializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        serializer_cls = DoctorProfileUpdateSerializer if request.user.role == Role.DOCTOR else DoctorSerializer
        serializer = serializer_cls(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return envelope(True, "Doctor profile updated.", DoctorSerializer(instance).data)

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        if request.user.role != Role.DOCTOR:
            return envelope(False, "This endpoint is for doctor accounts only.", status_code=status.HTTP_403_FORBIDDEN)
        try:
            doctor = Doctor.objects.get(user=request.user, is_deleted=False)
        except Doctor.DoesNotExist:
            return envelope(False, "No doctor profile found for this account.", status_code=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return envelope(True, "Profile retrieved.", DoctorSerializer(doctor).data)

        serializer = DoctorProfileUpdateSerializer(doctor, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return envelope(True, "Profile updated.", DoctorSerializer(doctor).data)


class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    """/api/v1/doctors/availability/?doctor=<id> — a doctor manages their own weekly schedule; Hospital Admin can too."""
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [drf_permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["doctor", "branch", "day_of_week", "is_active"]

    def get_queryset(self):
        user = self.request.user
        qs = DoctorAvailability.objects.select_related("doctor", "branch")
        if user.role == Role.SUPER_ADMIN:
            return qs
        if user.role == Role.DOCTOR:
            return qs.filter(doctor__user=user)
        return qs.filter(doctor__hospital_id=user.hospital_id) if user.hospital_id else qs.none()

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError
        user = self.request.user
        doctor = self._resolve_doctor(user)
        if doctor is None:
            raise ValidationError({"doctor": "This field is required."})
        if user.role not in (Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.DOCTOR):
            raise PermissionDenied("You may not manage doctor availability.")
        if user.role == Role.DOCTOR and doctor.user_id != user.id:
            raise PermissionDenied("You may only manage your own availability.")
        if user.role == Role.HOSPITAL_ADMIN and doctor.hospital_id != user.hospital_id:
            raise PermissionDenied("You may only manage availability for doctors in your own hospital.")
        serializer.save(doctor=doctor)

    def _resolve_doctor(self, user):
        doctor_id = self.request.data.get("doctor")
        if user.role == Role.DOCTOR and not doctor_id:
            return Doctor.objects.filter(user=user).first()
        if doctor_id:
            return Doctor.objects.filter(id=doctor_id).first()
        return None

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Availability retrieved.", response.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return envelope(True, "Availability slot created.", serializer.data, status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if user.role == Role.DOCTOR and instance.doctor.user_id != user.id:
            return envelope(False, "You may only delete your own availability.", status_code=status.HTTP_403_FORBIDDEN)
        instance.delete()
        return envelope(True, "Availability slot removed.")


class DoctorTimeOffViewSet(viewsets.ModelViewSet):
    """/api/v1/doctors/time-off/?doctor=<id> — a doctor marks themself unavailable for a date range."""
    serializer_class = DoctorTimeOffSerializer
    permission_classes = [drf_permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["doctor"]

    def get_queryset(self):
        user = self.request.user
        qs = DoctorTimeOff.objects.select_related("doctor")
        if user.role == Role.SUPER_ADMIN:
            return qs
        if user.role == Role.DOCTOR:
            return qs.filter(doctor__user=user)
        return qs.filter(doctor__hospital_id=user.hospital_id) if user.hospital_id else qs.none()

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user
        if user.role != Role.DOCTOR:
            raise PermissionDenied("Only a doctor may record their own time off.")
        doctor = Doctor.objects.filter(user=user).first()
        if not doctor:
            raise PermissionDenied("No doctor profile found for this account.")
        serializer.save(doctor=doctor)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Time off retrieved.", response.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return envelope(True, "Time off recorded.", serializer.data, status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role == Role.DOCTOR and instance.doctor.user_id != request.user.id:
            return envelope(False, "You may only delete your own time off.", status_code=status.HTTP_403_FORBIDDEN)
        instance.delete()
        return envelope(True, "Time off removed.")
