from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.accounts.models import User, OTP, PasswordResetToken, LoginSession
from apps.accounts.serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer, VerifyOTPSerializer,
    ResendOTPSerializer, ForgotPasswordSerializer, ResetPasswordSerializer,
    ChangePasswordSerializer, Enable2FASerializer, Verify2FASerializer,
)
from apps.accounts.services import (
    issue_tokens_for_user, issue_otp, verify_otp, issue_password_reset_token,
    generate_totp_secret, get_totp_provisioning_uri, verify_totp_code,
)


def envelope(success, message, data=None, status_code=status.HTTP_200_OK):
    return Response({"success": success, "message": message, "data": data}, status=status_code)


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/accounts/register/ — public patient self-registration (staff created by admins)."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        issue_otp(user, OTP.Purpose.EMAIL_VERIFICATION)
        return envelope(
            True,
            "Registration successful. Please check your email for a verification code.",
            UserSerializer(user).data,
            status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/v1/accounts/login/ — email+password login, returns JWT pair or a 2FA challenge."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return envelope(False, "Invalid email or password.", status_code=status.HTTP_401_UNAUTHORIZED)

        if user.is_locked:
            return envelope(
                False,
                "Account temporarily locked due to too many failed attempts. Try again later.",
                status_code=status.HTTP_423_LOCKED,
            )

        if not user.check_password(password):
            user.register_failed_login()
            return envelope(False, "Invalid email or password.", status_code=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return envelope(False, "This account has been deactivated.", status_code=status.HTTP_403_FORBIDDEN)

        if not user.is_verified:
            return envelope(False, "Please verify your email before logging in.", status_code=status.HTTP_403_FORBIDDEN)

        user.reset_failed_login()

        if user.is_2fa_enabled:
            issue_otp(user, OTP.Purpose.LOGIN_2FA) if not user.totp_secret else None
            return envelope(
                True,
                "Password verified. Enter your 2FA code to complete login.",
                {"requires_2fa": True, "email": user.email, "uses_authenticator_app": bool(user.totp_secret)},
            )

        tokens = issue_tokens_for_user(
            user,
            device_info=request.META.get("HTTP_USER_AGENT", ""),
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        user.last_login = timezone.now()
        user.last_login_ip = request.META.get("REMOTE_ADDR")
        user.save(update_fields=["last_login", "last_login_ip"])
        return envelope(True, "Login successful.", {**tokens, "user": UserSerializer(user).data})


class Verify2FALoginView(APIView):
    """POST /api/v1/accounts/2fa/verify/ — completes login after a 2FA challenge."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = "otp"

    def post(self, request):
        serializer = Verify2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email__iexact=serializer.validated_data["email"])
        except User.DoesNotExist:
            return envelope(False, "Invalid request.", status_code=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data["code"]
        if user.totp_secret:
            ok = verify_totp_code(user, code)
            message = "Invalid authenticator code." if not ok else None
        else:
            ok, message = verify_otp(user, code, OTP.Purpose.LOGIN_2FA)

        if not ok:
            return envelope(False, message or "Invalid code.", status_code=status.HTTP_400_BAD_REQUEST)

        tokens = issue_tokens_for_user(
            user, device_info=request.META.get("HTTP_USER_AGENT", ""), ip_address=request.META.get("REMOTE_ADDR")
        )
        return envelope(True, "Login successful.", {**tokens, "user": UserSerializer(user).data})


class VerifyOTPView(APIView):
    """POST /api/v1/accounts/verify-otp/ — verifies email/phone using a code."""
    permission_classes = [permissions.AllowAny]
    throttle_scope = "otp"

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user = User.objects.get(email__iexact=data["email"])
        except User.DoesNotExist:
            return envelope(False, "User not found.", status_code=status.HTTP_404_NOT_FOUND)

        ok, message = verify_otp(user, data["code"], data["purpose"])
        if not ok:
            return envelope(False, message, status_code=status.HTTP_400_BAD_REQUEST)

        if data["purpose"] == OTP.Purpose.EMAIL_VERIFICATION:
            user.is_verified = True
            user.save(update_fields=["is_verified"])
        elif data["purpose"] == OTP.Purpose.PHONE_VERIFICATION:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

        return envelope(True, message)


class ResendOTPView(APIView):
    """POST /api/v1/accounts/resend-otp/"""
    permission_classes = [permissions.AllowAny]
    throttle_scope = "otp"

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email__iexact=serializer.validated_data["email"])
        except User.DoesNotExist:
            return envelope(True, "If that account exists, a code has been sent.")
        issue_otp(user, serializer.validated_data["purpose"])
        return envelope(True, "A new code has been sent.")


class ForgotPasswordView(APIView):
    """POST /api/v1/accounts/forgot-password/"""
    permission_classes = [permissions.AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email__iexact=serializer.validated_data["email"])
            issue_password_reset_token(user)
        except User.DoesNotExist:
            pass  # Do not leak account existence
        return envelope(True, "If that email is registered, a reset link has been sent.")


class ResetPasswordView(APIView):
    """POST /api/v1/accounts/reset-password/"""
    permission_classes = [permissions.AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            token = PasswordResetToken.objects.get(id=data["token"])
        except PasswordResetToken.DoesNotExist:
            return envelope(False, "Invalid or expired reset link.", status_code=status.HTTP_400_BAD_REQUEST)

        if not token.is_valid():
            return envelope(False, "This reset link has expired.", status_code=status.HTTP_400_BAD_REQUEST)

        user = token.user
        user.set_password(data["new_password"])
        user.save(update_fields=["password"])
        token.is_used = True
        token.save(update_fields=["is_used"])
        # Invalidate all existing sessions on password change
        LoginSession.objects.filter(user=user, is_active=True).update(is_active=False)
        return envelope(True, "Password reset successful. Please log in with your new password.")


class ChangePasswordView(APIView):
    """POST /api/v1/accounts/change-password/ — for an already-authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user
        if not user.check_password(data["old_password"]):
            return envelope(False, "Old password is incorrect.", status_code=status.HTTP_400_BAD_REQUEST)
        user.set_password(data["new_password"])
        user.save(update_fields=["password"])
        return envelope(True, "Password changed successfully.")


class LogoutView(APIView):
    """POST /api/v1/accounts/logout/ — blacklists the refresh token, ends the session."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return envelope(False, "Refresh token is required.", status_code=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            LoginSession.objects.filter(refresh_token_jti=str(token["jti"])).update(is_active=False)
            token.blacklist()
        except TokenError:
            return envelope(False, "Invalid token.", status_code=status.HTTP_400_BAD_REQUEST)
        return envelope(True, "Logged out successfully.")


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/accounts/me/ — current user's profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return envelope(True, "Profile retrieved.", serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return envelope(True, "Profile updated.", serializer.data)



class Enable2FAView(APIView):
    """
    POST /api/v1/accounts/2fa/enable/ — step 1: generates a TOTP secret + QR
    provisioning URI. The client scans it in an authenticator app, then
    confirms with Enable2FAConfirmView before 2FA is actually switched on.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.totp_secret = generate_totp_secret()
        user.save(update_fields=["totp_secret"])
        return envelope(
            True,
            "Scan this QR code in your authenticator app, then confirm with a code.",
            {"provisioning_uri": get_totp_provisioning_uri(user)},
        )


class Enable2FAConfirmView(APIView):
    """POST /api/v1/accounts/2fa/confirm/ — step 2: verifies the first TOTP code and activates 2FA."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = Enable2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not verify_totp_code(user, serializer.validated_data.get("code", "")):
            return envelope(False, "Invalid authenticator code.", status_code=status.HTTP_400_BAD_REQUEST)
        user.is_2fa_enabled = True
        user.save(update_fields=["is_2fa_enabled"])
        return envelope(True, "Two-factor authentication enabled.")


class Disable2FAView(APIView):
    """POST /api/v1/accounts/2fa/disable/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_2fa_enabled = False
        user.totp_secret = ""
        user.save(update_fields=["is_2fa_enabled", "totp_secret"])
        return envelope(True, "Two-factor authentication disabled.")


class SessionListView(APIView):
    """GET /api/v1/accounts/sessions/ — list this user's active login sessions (device management)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = LoginSession.objects.filter(user=request.user, is_active=True)
        data = [
            {
                "id": str(s.id),
                "device_info": s.device_info,
                "ip_address": s.ip_address,
                "created_at": s.created_at,
                "last_used_at": s.last_used_at,
            }
            for s in sessions
        ]
        return envelope(True, "Active sessions retrieved.", data)


class SessionRevokeView(APIView):
    """POST /api/v1/accounts/sessions/<id>/revoke/ — force-logout a specific device."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        updated = LoginSession.objects.filter(id=session_id, user=request.user).update(is_active=False)
        if not updated:
            return envelope(False, "Session not found.", status_code=status.HTTP_404_NOT_FOUND)
        return envelope(True, "Session revoked.")


class CustomTokenRefreshView(TokenRefreshView):
    """Wraps simplejwt's refresh view in the standard response envelope."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            return envelope(True, "Token refreshed.", response.data)
        return response
