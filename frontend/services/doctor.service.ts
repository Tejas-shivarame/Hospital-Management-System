import { api } from "@/lib/axios";
import type { ApiEnvelope } from "@/types/auth.types";
import type { PaginatedResponse } from "@/types/hospital.types";
import type { Doctor, Specialization, DoctorAvailability, DoctorTimeOff } from "@/types/doctor.types";

export const specializationService = {
  list: () => api.get<ApiEnvelope<PaginatedResponse<Specialization>>>("/doctors/specializations/"),
  create: (payload: { name: string; description?: string }) =>
    api.post<ApiEnvelope<Specialization>>("/doctors/specializations/", payload),
};

export const doctorService = {
  list: (params?: Record<string, string>) =>
    api.get<ApiEnvelope<PaginatedResponse<Doctor>>>("/doctors/", { params }),

  retrieve: (id: string) => api.get<ApiEnvelope<Doctor>>(`/doctors/${id}/`),

  createProfile: (payload: {
    user_id: string; branch: string; department?: string; license_number: string;
    qualification?: string; experience_years?: number; consultation_fee?: string;
    consultation_duration_minutes?: number; bio?: string; languages_spoken?: string;
    specialization_ids?: string[]; hospital?: string;
  }) => api.post<ApiEnvelope<Doctor>>("/doctors/profiles/", payload),

  me: () => api.get<ApiEnvelope<Doctor>>("/doctors/me/"),

  updateMe: (payload: Partial<Omit<Doctor, "consultation_fee">> & { consultation_fee?: string; specialization_ids?: string[] }) =>
    api.patch<ApiEnvelope<Doctor>>("/doctors/me/", payload),
};

export const doctorAvailabilityService = {
  list: (doctorId: string) =>
    api.get<ApiEnvelope<PaginatedResponse<DoctorAvailability>>>("/doctors/availability/", {
      params: { doctor: doctorId },
    }),

  create: (payload: { doctor?: string; branch: string; day_of_week: number; start_time: string; end_time: string }) =>
    api.post<ApiEnvelope<DoctorAvailability>>("/doctors/availability/", payload),

  delete: (id: string) => api.delete<ApiEnvelope<null>>(`/doctors/availability/${id}/`),
};

export const doctorTimeOffService = {
  list: (doctorId: string) =>
    api.get<ApiEnvelope<PaginatedResponse<DoctorTimeOff>>>("/doctors/time-off/", { params: { doctor: doctorId } }),

  create: (payload: { start_date: string; end_date: string; reason?: string }) =>
    api.post<ApiEnvelope<DoctorTimeOff>>("/doctors/time-off/", payload),

  delete: (id: string) => api.delete<ApiEnvelope<null>>(`/doctors/time-off/${id}/`),
};
