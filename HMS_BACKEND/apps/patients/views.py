from rest_framework import viewsets, status, permissions as drf_permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.patients.models import Patient, PatientDocument
from apps.patients.serializers import (
    PatientSerializer, PatientUpdateSerializer, PatientRegistrationSerializer, PatientDocumentSerializer,
)
from apps.patients.permissions import CanRegisterPatients, CanAccessPatientRecord
from apps.patients.services import dispatch_patient_registration_notice
from apps.accounts.models import Role


def envelope(success, message, data=None, status_code=status.HTTP_200_OK):
    return Response({"success": success, "message": message, "data": data}, status=status_code)


class PatientRegistrationView(APIView):
    """POST /api/v1/patients/register/ — staff-assisted registration of a walk-in/phone-in patient."""
    permission_classes = [CanRegisterPatients]
    throttle_scope = "register"

    def post(self, request):
        hospital = request.user.hospital
        if not hospital:
            return envelope(False, "You are not assigned to a hospital.", status_code=status.HTTP_400_BAD_REQUEST)

        serializer = PatientRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient, user = serializer.save(hospital=hospital, registered_by=request.user)

        dispatch_patient_registration_notice(user)

        return envelope(
            True,
            "Patient registered successfully. A password-setup link has been sent to their email.",
            PatientSerializer(patient).data,
            status.HTTP_201_CREATED,
        )


class PatientViewSet(viewsets.ModelViewSet):
    """
    /api/v1/patients/
    Staff (Receptionist/Nurse/Doctor/Hospital Admin/Super Admin): search & view
    patients within their own hospital (Super Admin: any hospital).
    Patients: can only see and lightly edit their own record via /patients/me/.
    Creation happens through PatientRegistrationView, not POST here.
    """
    serializer_class = PatientSerializer
    http_method_names = ["get", "patch", "head", "options"]  # create/delete handled elsewhere
    permission_classes = [drf_permissions.IsAuthenticated, CanAccessPatientRecord]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["hospital", "branch", "blood_group"]
    search_fields = ["mrn", "user__first_name", "user__last_name", "user__email", "user__phone"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Patient.objects.filter(is_deleted=False).select_related("user", "hospital", "branch")
        if user.role == Role.SUPER_ADMIN:
            return qs
        if user.role == Role.PATIENT:
            return qs.filter(user=user)
        return qs.filter(hospital_id=user.hospital_id) if user.hospital_id else qs.none()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Patients retrieved.", response.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return envelope(True, "Patient retrieved.", self.get_serializer(instance).data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        # Patients may only touch their own clinical-lite fields; staff can use the full serializer.
        serializer_cls = PatientUpdateSerializer if request.user.role == Role.PATIENT else PatientSerializer
        serializer = serializer_cls(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return envelope(True, "Patient record updated.", PatientSerializer(instance).data)

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        """Convenience endpoint for a logged-in patient to fetch/update their own profile."""
        if request.user.role != Role.PATIENT:
            return envelope(False, "This endpoint is for patient accounts only.", status_code=status.HTTP_403_FORBIDDEN)
        try:
            patient = Patient.objects.get(user=request.user, is_deleted=False)
        except Patient.DoesNotExist:
            return envelope(False, "No patient profile found for this account.", status_code=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            return envelope(True, "Profile retrieved.", PatientSerializer(patient).data)

        serializer = PatientUpdateSerializer(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return envelope(True, "Profile updated.", PatientSerializer(patient).data)


class PatientDocumentViewSet(viewsets.ModelViewSet):
    """
    /api/v1/patients/documents/?patient=<id>
    Patients upload/view their own documents; staff within the same hospital
    can upload/view on a patient's behalf (e.g. scanning in a lab report).
    """
    serializer_class = PatientDocumentSerializer
    permission_classes = [drf_permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["patient", "document_type"]

    def get_queryset(self):
        user = self.request.user
        qs = PatientDocument.objects.select_related("patient", "uploaded_by")
        if user.role == Role.SUPER_ADMIN:
            return qs
        if user.role == Role.PATIENT:
            return qs.filter(patient__user=user)
        return qs.filter(patient__hospital_id=user.hospital_id) if user.hospital_id else qs.none()

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied, ValidationError
        patient = serializer.validated_data.get("patient")
        if not patient:
            raise ValidationError({"patient": "This field is required."})
        user = self.request.user
        if user.role == Role.PATIENT and patient.user_id != user.id:
            raise PermissionDenied("You may only upload documents to your own record.")
        if user.role not in (Role.PATIENT, Role.SUPER_ADMIN) and patient.hospital_id != user.hospital_id:
            raise PermissionDenied("You may only upload documents for patients in your own hospital.")
        serializer.save(uploaded_by=user)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return envelope(True, "Documents retrieved.", response.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return envelope(True, "Document retrieved.", self.get_serializer(instance).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return envelope(True, "Document uploaded.", serializer.data, status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if user.role == Role.PATIENT and instance.patient.user_id != user.id:
            return envelope(False, "You may only delete your own documents.", status_code=status.HTTP_403_FORBIDDEN)
        instance.delete()
        return envelope(True, "Document deleted.")
