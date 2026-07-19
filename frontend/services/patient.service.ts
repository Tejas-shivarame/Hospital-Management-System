import { api } from "@/lib/axios";
import type { ApiEnvelope } from "@/types/auth.types";
import type { Patient, PatientDocument } from "@/types/patient.types";
import type { PaginatedResponse } from "@/types/hospital.types";

export const patientService = {
  register: (payload: {
    email: string; first_name: string; last_name: string; phone?: string;
    date_of_birth?: string; gender?: string; address?: string; branch: string;
    blood_group?: string; emergency_contact_name?: string; emergency_contact_phone?: string;
    emergency_contact_relation?: string; known_allergies?: string; chronic_conditions?: string;
    insurance_provider?: string; insurance_policy_number?: string;
  }) => api.post<ApiEnvelope<Patient>>("/patients/register/", payload),

  list: (params?: Record<string, string>) =>
    api.get<ApiEnvelope<PaginatedResponse<Patient>>>("/patients/", { params }),

  retrieve: (id: string) => api.get<ApiEnvelope<Patient>>(`/patients/${id}/`),

  update: (id: string, payload: Partial<Omit<Patient, "blood_group">> & { blood_group?: string }) =>
    api.patch<ApiEnvelope<Patient>>(`/patients/${id}/`, payload),

  me: () => api.get<ApiEnvelope<Patient>>("/patients/me/"),

  updateMe: (payload: Partial<Omit<Patient, "blood_group">> & { blood_group?: string }) =>
    api.patch<ApiEnvelope<Patient>>("/patients/me/", payload),
};

export const patientDocumentService = {
  list: (patientId: string) =>
    api.get<ApiEnvelope<PaginatedResponse<PatientDocument>>>("/patients/documents/", {
      params: { patient: patientId },
    }),

  upload: (patientId: string, file: File, title: string, documentType: string) => {
    const formData = new FormData();
    formData.append("patient", patientId);
    formData.append("file", file);
    formData.append("title", title);
    formData.append("document_type", documentType);
    return api.post<ApiEnvelope<PatientDocument>>("/patients/documents/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  delete: (id: string) => api.delete<ApiEnvelope<null>>(`/patients/documents/${id}/`),
};
