import { z } from "zod";

export const patientRegistrationSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  phone: z.string().optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other", ""]).optional(),
  address: z.string().optional().or(z.literal("")),
  branch: z.string().min(1, "Select a branch"),
  blood_group: z.string().optional().or(z.literal("")),
  emergency_contact_name: z.string().optional().or(z.literal("")),
  emergency_contact_phone: z.string().optional().or(z.literal("")),
  emergency_contact_relation: z.string().optional().or(z.literal("")),
  known_allergies: z.string().optional().or(z.literal("")),
  chronic_conditions: z.string().optional().or(z.literal("")),
  insurance_provider: z.string().optional().or(z.literal("")),
  insurance_policy_number: z.string().optional().or(z.literal("")),
});
export type PatientRegistrationFormValues = z.infer<typeof patientRegistrationSchema>;

export const patientClinicalUpdateSchema = z.object({
  blood_group: z.string().optional().or(z.literal("")),
  emergency_contact_name: z.string().optional().or(z.literal("")),
  emergency_contact_phone: z.string().optional().or(z.literal("")),
  emergency_contact_relation: z.string().optional().or(z.literal("")),
  marital_status: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  known_allergies: z.string().optional().or(z.literal("")),
  chronic_conditions: z.string().optional().or(z.literal("")),
  insurance_provider: z.string().optional().or(z.literal("")),
  insurance_policy_number: z.string().optional().or(z.literal("")),
});
export type PatientClinicalUpdateFormValues = z.infer<typeof patientClinicalUpdateSchema>;
