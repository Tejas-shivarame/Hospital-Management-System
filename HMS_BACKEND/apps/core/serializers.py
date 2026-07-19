from django.db import transaction
from rest_framework import serializers

from apps.core.models import Hospital, Branch, Department
from apps.accounts.models import User, Role


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = [
            "id", "hospital", "name", "code", "address", "city", "state",
            "phone", "email", "is_main_branch", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {"hospital": {"required": False}}
        validators = []  # replaced by manual uniqueness check in validate() below, since 'hospital' is server-assigned

    def validate(self, attrs):
        # hospital is set by the view for nested create; guard for direct calls too
        hospital = attrs.get("hospital") or getattr(self.instance, "hospital", None)
        code = attrs.get("code") or getattr(self.instance, "code", None)
        qs = Branch.objects.filter(hospital=hospital, code=code, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"code": "A branch with this code already exists for this hospital."})
        return attrs


class HospitalSerializer(serializers.ModelSerializer):
    branch_count = serializers.IntegerField(source="branches.count", read_only=True)

    class Meta:
        model = Hospital
        fields = [
            "id", "name", "slug", "registration_number", "email", "phone",
            "address", "city", "state", "country", "postal_code", "logo",
            "is_active", "subscription_plan", "branch_count", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class HospitalWithAdminSerializer(serializers.Serializer):
    """
    Used by Super Admin only: creates a Hospital, its main Branch, and its
    first Hospital Admin user in a single transactional call.
    """
    hospital = HospitalSerializer()
    admin_first_name = serializers.CharField(max_length=150)
    admin_last_name = serializers.CharField(max_length=150)
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, min_length=8)

    def validate_admin_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        hospital_data = validated_data.pop("hospital")
        hospital = Hospital.objects.create(**hospital_data)

        main_branch = Branch.objects.create(
            hospital=hospital,
            name=f"{hospital.name} — Main Branch",
            code="MAIN",
            address=hospital.address,
            city=hospital.city,
            state=hospital.state,
            phone=hospital.phone,
            email=hospital.email,
            is_main_branch=True,
        )

        admin = User(
            email=validated_data["admin_email"],
            first_name=validated_data["admin_first_name"],
            last_name=validated_data["admin_last_name"],
            role=Role.HOSPITAL_ADMIN,
            hospital=hospital,
            branch=main_branch,
            is_verified=True,  # admin accounts provisioned by Super Admin don't need email verification
        )
        admin.set_password(validated_data["admin_password"])
        admin.save()

        return {"hospital": hospital, "main_branch": main_branch, "admin": admin}


class DepartmentSerializer(serializers.ModelSerializer):
    head_of_department_name = serializers.CharField(
        source="head_of_department.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = Department
        fields = [
            "id", "hospital", "branch", "name", "code", "description",
            "head_of_department", "head_of_department_name", "is_active", "created_at",
        ]
        read_only_fields = ["id", "hospital", "created_at"]

    def validate_head_of_department(self, value):
        if value and value.role != Role.DOCTOR:
            raise serializers.ValidationError("Head of department must be a Doctor.")
        return value

    def validate(self, attrs):
        branch = attrs.get("branch") or getattr(self.instance, "branch", None)
        code = attrs.get("code") or getattr(self.instance, "code", None)
        qs = Department.objects.filter(branch=branch, code=code, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"code": "A department with this code already exists for this branch."})
        return attrs


class StaffAssignSerializer(serializers.Serializer):
    """Assigns an existing staff user to a hospital/branch/department, or creates a new staff account."""

    STAFF_ROLES = (
        Role.HOSPITAL_ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.NURSE,
        Role.LAB_TECHNICIAN, Role.PHARMACIST, Role.ACCOUNTANT,
    )

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    role = serializers.ChoiceField(choices=[(r, r.label) for r in STAFF_ROLES])
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.filter(is_deleted=False))
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.filter(is_deleted=False), required=False, allow_null=True
    )

    def validate(self, attrs):
        branch = attrs["branch"]
        department = attrs.get("department")
        if department and department.branch_id != branch.id:
            raise serializers.ValidationError({"department": "Department does not belong to the selected branch."})

        existing = User.objects.filter(email__iexact=attrs["email"]).first()
        if not existing:
            for field in ("first_name", "last_name", "password"):
                if not attrs.get(field):
                    raise serializers.ValidationError({field: "Required when creating a new staff account."})
        attrs["_existing_user"] = existing
        return attrs

    @transaction.atomic
    def save(self, hospital):
        data = self.validated_data
        user = data.pop("_existing_user")
        branch = data["branch"]
        department = data.get("department")

        if user:
            user.role = data["role"]
            user.hospital = hospital
            user.branch = branch
            user.department = department
            user.save(update_fields=["role", "hospital", "branch", "department"])
        else:
            user = User(
                email=data["email"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                role=data["role"],
                hospital=hospital,
                branch=branch,
                department=department,
                is_verified=True,
            )
            user.set_password(data["password"])
            user.save()
        return user
