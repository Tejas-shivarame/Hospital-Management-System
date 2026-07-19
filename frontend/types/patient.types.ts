export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";

export interface PatientUserSummary {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string;
  address: string;
}

export interface Patient {
  id: string;
  user: PatientUserSummary;
  hospital: string;
  branch: string;
  mrn: string;
  blood_group: BloodGroup;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  marital_status: string;
  occupation: string;
  known_allergies: string;
  chronic_conditions: string;
  insurance_provider: string;
  insurance_policy_number: string;
  registered_by: string | null;
  registered_by_name: string | null;
  created_at: string;
}

export type DocumentType =
  | "lab_report"
  | "prescription"
  | "id_proof"
  | "insurance"
  | "discharge_summary"
  | "other";

export interface PatientDocument {
  id: string;
  patient: string;
  document_type: DocumentType;
  title: string;
  file: string;
  notes: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}
