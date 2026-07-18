from django.contrib.auth import password_validation
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User, Role, OTP, PasswordResetToken
from apps.core.models import Hospital, Branch


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "phone", "first_name", "last_name", "full_name",
            "role", "hospital", "branch", "avatar", "date_of_birth", "gender",
            "address", "is_verified", "is_phone_verified", "is_2fa_enabled",
            "created_at",
        ]
        read_only_fields = ["id", "is_verified", "is_phone_verified", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    hospital = serializers.PrimaryKeyRelatedField(
        queryset=Hospital.objects.filter(is_deleted=False), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "id", "email", "phone", "first_name", "last_name", "password",
            "confirm_password", "role", "hospital", "branch",
        ]
        read_only_fields = ["id"]

    def validate_role(self, value):
        # Staff roles must be created by a Hospital Admin / Super Admin via the
        # staff-management endpoint, not public self-registration.
        request = self.context.get("request")
        public_allowed_roles = {Role.PATIENT}
        if value not in public_allowed_roles:
            if not (request and request.user.is_authenticated and request.user.role in (Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN)):
                raise serializers.ValidationError(
                    "Only a Hospital Admin can create staff accounts. Self-registration is limited to patients."
                )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=8)
    purpose = serializers.ChoiceField(choices=OTP.Purpose.choices)


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=OTP.Purpose.choices)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class Enable2FASerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6, required=False)


class Verify2FASerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
