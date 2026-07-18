from django.urls import path
from apps.accounts import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("token/refresh/", views.CustomTokenRefreshView.as_view(), name="token_refresh"),

    path("verify-otp/", views.VerifyOTPView.as_view(), name="verify_otp"),
    path("resend-otp/", views.ResendOTPView.as_view(), name="resend_otp"),

    path("forgot-password/", views.ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset_password"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change_password"),

    path("2fa/enable/", views.Enable2FAView.as_view(), name="2fa_enable"),
    path("2fa/confirm/", views.Enable2FAConfirmView.as_view(), name="2fa_confirm"),
    path("2fa/disable/", views.Disable2FAView.as_view(), name="2fa_disable"),
    path("2fa/verify/", views.Verify2FALoginView.as_view(), name="2fa_verify"),

    path("me/", views.MeView.as_view(), name="me"),

    path("sessions/", views.SessionListView.as_view(), name="sessions"),
    path("sessions/<uuid:session_id>/revoke/", views.SessionRevokeView.as_view(), name="session_revoke"),
]
