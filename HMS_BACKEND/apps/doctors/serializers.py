from rest_framework import serializers

from apps.doctors.models import Specialization, Doctor, DoctorAvailability, DoctorTimeOff
from apps.accounts.models import User, Role
from apps.core.models import Branch, Department


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ["id", "name", "description", "is_active"]
        read_only_fields = ["id"]


class DoctorUserSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "phone", "first_name", "last_name", "full_name", "avatar"]


class DoctorSerializer(serializers.ModelSerializer):
    user = DoctorUserSummarySerializer(read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True, default=None)
    branch_name = serializers.CharField(source="branch.name", read_only=True, default=None)
    specializations = SpecializationSerializer(many=True, read_only=True)
    specialization_ids = serializers.PrimaryKeyRelatedField(
        source="specializations", queryset=Specialization.objects.filter(is_active=True),
        many=True, write_only=True, required=False,
    )

    class Meta:
        model = Doctor
        fields = [
            "id", "user", "hospital", "branch", "branch_name", "department", "department_name",
            "specializations", "specialization_ids", "license_number", "qualification",
            "experience_years", "consultation_fee", "consultation_duration_minutes", "bio",
            "languages_spoken", "is_available_for_appointments", "created_at",
        ]
        read_only_fields = ["id", "hospital", "created_at"]


class DoctorProfileUpdateSerializer(serializers.ModelSerializer):
    """Narrower serializer for a doctor editing their own profile (no license/department reassignment here)."""
    specialization_ids = serializers.PrimaryKeyRelatedField(
        source="specializations", queryset=Specialization.objects.filter(is_active=True), many=True, required=False,
    )

    class Meta:
        model = Doctor
        fields = [
            "qualification", "experience_years", "consultation_fee", "consultation_duration_minutes",
            "bio", "languages_spoken", "is_available_for_appointments", "specialization_ids",
        ]


class DoctorProfileCreateSerializer(serializers.Serializer):
    """
    Used by Hospital Admin/Super Admin to complete the clinical profile for
    a User who already has role=doctor (created via staff assignment in
    Module 2), attaching license/specializations/etc.
    """

    user_id = serializers.PrimaryKeyRelatedField(source="user", queryset=User.objects.filter(role=Role.DOCTOR))
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.filter(is_deleted=False))
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.filter(is_deleted=False), required=False, allow_null=True
    )
    specialization_ids = serializers.PrimaryKeyRelatedField(
        source="specializations", queryset=Specialization.objects.filter(is_active=True), many=True, required=False,
    )
    license_number = serializers.CharField(max_length=100)
    qualification = serializers.CharField(required=False, allow_blank=True)
    experience_years = serializers.IntegerField(required=False, default=0)
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    consultation_duration_minutes = serializers.IntegerField(required=False, default=15)
    bio = serializers.CharField(required=False, allow_blank=True)
    languages_spoken = serializers.CharField(required=False, allow_blank=True)

    def validate_user_id(self, user):
        if hasattr(user, "doctor_profile"):
            raise serializers.ValidationError("This user already has a doctor profile.")
        return user

    def validate_license_number(self, value):
        if Doctor.objects.filter(license_number=value).exists():
            raise serializers.ValidationError("A doctor with this license number already exists.")
        return value

    def save(self, hospital):
        data = self.validated_data
        user = data["user"]
        branch = data["branch"]
        department = data.get("department")

        if user.hospital_id != hospital.id:
            raise serializers.ValidationError({"user_id": "This user does not belong to your hospital."})
        if branch.hospital_id != hospital.id:
            raise serializers.ValidationError({"branch": "Branch does not belong to your hospital."})
        if department and department.hospital_id != hospital.id:
            raise serializers.ValidationError({"department": "Department does not belong to your hospital."})

        specializations = data.pop("specializations", [])
        doctor = Doctor.objects.create(
            user=user,
            hospital=hospital,
            branch=branch,
            department=department,
            license_number=data["license_number"],
            qualification=data.get("qualification", ""),
            experience_years=data.get("experience_years", 0),
            consultation_fee=data.get("consultation_fee", 0),
            consultation_duration_minutes=data.get("consultation_duration_minutes", 15),
            bio=data.get("bio", ""),
            languages_spoken=data.get("languages_spoken", ""),
        )
        if specializations:
            doctor.specializations.set(specializations)
        return doctor


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    day_of_week_display = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = DoctorAvailability
        fields = ["id", "doctor", "branch", "day_of_week", "day_of_week_display", "start_time", "end_time", "is_active"]
        read_only_fields = ["id", "doctor"]

    def validate(self, attrs):
        start = attrs.get("start_time") or getattr(self.instance, "start_time", None)
        end = attrs.get("end_time") or getattr(self.instance, "end_time", None)
        if start and end and start >= end:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        return attrs


class DoctorTimeOffSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorTimeOff
        fields = ["id", "doctor", "start_date", "end_date", "reason", "created_at"]
        read_only_fields = ["id", "doctor", "created_at"]

    def validate(self, attrs):
        start = attrs.get("start_date") or getattr(self.instance, "start_date", None)
        end = attrs.get("end_date") or getattr(self.instance, "end_date", None)
        if start and end and start > end:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})
        return attrs
