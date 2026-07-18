import { api } from "@/lib/axios";
import type {
  ApiEnvelope, User, LoginResponseData, OtpPurpose,
} from "@/types/auth.types";

export const authService = {
  register: (payload: {
    first_name: string; last_name: string; email: string;
    phone?: string; password: string; confirm_password: string;
  }) => api.post<ApiEnvelope<User>>("/accounts/register/", { ...payload, role: "patient" }),

  login: (payload: { email: string; password: string }) =>
    api.post<ApiEnvelope<LoginResponseData>>("/accounts/login/", payload),

  verify2FALogin: (payload: { email: string; code: string }) =>
    api.post<ApiEnvelope<LoginResponseData>>("/accounts/2fa/verify/", payload),

  verifyOtp: (payload: { email: string; code: string; purpose: OtpPurpose }) =>
    api.post<ApiEnvelope<null>>("/accounts/verify-otp/", payload),

  resendOtp: (payload: { email: string; purpose: OtpPurpose }) =>
    api.post<ApiEnvelope<null>>("/accounts/resend-otp/", payload),

  forgotPassword: (payload: { email: string }) =>
    api.post<ApiEnvelope<null>>("/accounts/forgot-password/", payload),

  resetPassword: (payload: { token: string; new_password: string; confirm_password: string }) =>
    api.post<ApiEnvelope<null>>("/accounts/reset-password/", payload),

  changePassword: (payload: { old_password: string; new_password: string; confirm_password: string }) =>
    api.post<ApiEnvelope<null>>("/accounts/change-password/", payload),

  logout: (refresh: string) => api.post<ApiEnvelope<null>>("/accounts/logout/", { refresh }),

  me: () => api.get<ApiEnvelope<User>>("/accounts/me/"),

  updateMe: (payload: Partial<User>) => api.patch<ApiEnvelope<User>>("/accounts/me/", payload),

  enable2FA: () => api.post<ApiEnvelope<{ provisioning_uri: string }>>("/accounts/2fa/enable/"),

  confirm2FA: (code: string) => api.post<ApiEnvelope<null>>("/accounts/2fa/confirm/", { code }),

  disable2FA: () => api.post<ApiEnvelope<null>>("/accounts/2fa/disable/"),

  sessions: () => api.get<ApiEnvelope<Array<{ id: string; device_info: string; ip_address: string; created_at: string; last_used_at: string }>>>("/accounts/sessions/"),

  revokeSession: (id: string) => api.post<ApiEnvelope<null>>(`/accounts/sessions/${id}/revoke/`),
};
