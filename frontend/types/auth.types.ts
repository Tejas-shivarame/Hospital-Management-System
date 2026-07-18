export type Role =
  | "super_admin"
  | "hospital_admin"
  | "doctor"
  | "receptionist"
  | "nurse"
  | "lab_technician"
  | "pharmacist"
  | "accountant"
  | "patient";

export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  hospital: string | null;
  branch: string | null;
  avatar: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | "";
  address: string;
  is_verified: boolean;
  is_phone_verified: boolean;
  is_2fa_enabled: boolean;
  created_at: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors: Record<string, string[]> | null;
  status_code: number;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponseData extends Partial<AuthTokens> {
  user?: User;
  requires_2fa?: boolean;
  email?: string;
  uses_authenticator_app?: boolean;
}

export type OtpPurpose =
  | "email_verification"
  | "phone_verification"
  | "login_2fa"
  | "password_reset";
