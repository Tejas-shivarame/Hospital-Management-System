import { api } from "@/lib/axios";
import type { ApiEnvelope, User } from "@/types/auth.types";
import type { Hospital, Branch, Department, PaginatedResponse } from "@/types/hospital.types";

export const hospitalService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiEnvelope<PaginatedResponse<Hospital>>>("/core/hospitals/", { params }),

  retrieve: (id: string) => api.get<ApiEnvelope<Hospital>>(`/core/hospitals/${id}/`),

  onboard: (payload: {
    hospital: Omit<Hospital, "id" | "branch_count" | "created_at" | "logo">;
    admin_first_name: string;
    admin_last_name: string;
    admin_email: string;
    admin_password: string;
  }) =>
    api.post<ApiEnvelope<{ hospital: Hospital; main_branch: Branch; admin: User }>>(
      "/core/hospitals/onboard/",
      payload
    ),

  update: (id: string, payload: Partial<Hospital>) =>
    api.patch<ApiEnvelope<Hospital>>(`/core/hospitals/${id}/`, payload),

  deactivate: (id: string) => api.delete<ApiEnvelope<null>>(`/core/hospitals/${id}/`),
};

export const branchService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiEnvelope<PaginatedResponse<Branch>>>("/core/branches/", { params }),

  create: (payload: Partial<Branch>) => api.post<ApiEnvelope<Branch>>("/core/branches/", payload),

  update: (id: string, payload: Partial<Branch>) =>
    api.patch<ApiEnvelope<Branch>>(`/core/branches/${id}/`, payload),

  deactivate: (id: string) => api.delete<ApiEnvelope<null>>(`/core/branches/${id}/`),
};

export const departmentService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiEnvelope<PaginatedResponse<Department>>>("/core/departments/", { params }),

  create: (payload: Partial<Department>) =>
    api.post<ApiEnvelope<Department>>("/core/departments/", payload),

  update: (id: string, payload: Partial<Department>) =>
    api.patch<ApiEnvelope<Department>>(`/core/departments/${id}/`, payload),

  deactivate: (id: string) => api.delete<ApiEnvelope<null>>(`/core/departments/${id}/`),
};

export const staffService = {
  assign: (payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    password?: string;
    role: string;
    branch: string;
    department?: string;
    hospital?: string; // required only for Super Admin
  }) => api.post<ApiEnvelope<User>>("/core/staff/assign/", payload),
};
