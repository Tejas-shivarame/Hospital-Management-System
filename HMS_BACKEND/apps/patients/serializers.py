import secrets
from django.db import transaction
from rest_framework import serializers

from apps.patients.models import Patient, PatientDocument
from apps.accounts.models import User, Role
from apps.core.models import Branch


class PatientUserSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "phone", "first_name", "last_name", "full_name", "date_of_birth", "gender", "address"]


class PatientSerializer(serializers.ModelSerializer):
    user = PatientUserSummarySerializer(read_only=True)
    registered_by_name = serializers.CharField(source="registered_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = Patient
        fields = [
            "id", "user", "hospital", "branch", "mrn", "blood_group",
            "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation",
            "marital_status", "occupation", "known_allergies", "chronic_conditions",
            "insurance_provider", "insurance_policy_number",
            "registered_by", "registered_by_name", "created_at",
        ]
        read_only_fields = ["id", "hospital", "mrn", "registered_by", "created_at"]


class PatientUpdateSerializer(serializers.ModelSerializer):
    """Narrower serializer for self-service profile edits (patient updating their own clinical info)."""

    class Meta:
        model = Patient
        fields = [
            "blood_group", "emergency_contact_name", "emergency_contact_phone",
            "emergency_contact_relation", "marital_status", "occupation",
            "known_allergies", "chronic_conditions", "insurance_provider", "insurance_policy_number",
        ]


class PatientRegistrationSerializer(serializers.Serializer):
    """
    Used by Receptionist/Hospital Admin to register a walk-in or phone-in
    patient. If no password is supplied, one is generated and a password
    reset email is sent so the patient can set their own on first login.
    """

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=[("male", "Male"), ("female", "Female"), ("other", "Other")], required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.filter(is_deleted=False))

    blood_group = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_relation = serializers.CharField(required=False, allow_blank=True)
    known_allergies = serializers.CharField(required=False, allow_blank=True)
    chronic_conditions = serializers.CharField(required=False, allow_blank=True)
    insurance_provider = serializers.CharField(required=False, allow_blank=True)
    insurance_policy_number = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    @transaction.atomic
    def save(self, hospital, registered_by):
        data = self.validated_data
        branch = data["branch"]
        if branch.hospital_id != hospital.id:
            raise serializers.ValidationError({"branch": "Branch does not belong to this hospital."})

        user = User(
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            phone=data.get("phone", ""),
            date_of_birth=data.get("date_of_birth"),
            gender=data.get("gender", ""),
            address=data.get("address", ""),
            role=Role.PATIENT,
            hospital=hospital,
            branch=branch,
            is_verified=True,  # registered in-person by staff; no email OTP loop needed
        )
        temp_password = secrets.token_urlsafe(12)
        user.set_password(temp_password)
        user.save()

        patient = Patient.objects.create(
            user=user,
            hospital=hospital,
            branch=branch,
            blood_group=data.get("blood_group") or "unknown",
            emergency_contact_name=data.get("emergency_contact_name", ""),
            emergency_contact_phone=data.get("emergency_contact_phone", ""),
            emergency_contact_relation=data.get("emergency_contact_relation", ""),
            known_allergies=data.get("known_allergies", ""),
            chronic_conditions=data.get("chronic_conditions", ""),
            insurance_provider=data.get("insurance_provider", ""),
            insurance_policy_number=data.get("insurance_policy_number", ""),
            registered_by=registered_by,
        )
        return patient, user


class PatientDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = PatientDocument
        fields = ["id", "patient", "document_type", "title", "file", "notes", "uploaded_by", "uploaded_by_name", "created_at"]
        read_only_fields = ["id", "uploaded_by", "created_at"]
