import { z } from "zod";

export const onboardHospitalSchema = z.object({
  name: z.string().min(2, "Required"),
  slug: z
    .string()
    .min(2, "Required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  registration_number: z.string().min(1, "Required"),
  email: z.string().email(),
  phone: z.string().min(6, "Required"),
  address: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  country: z.string().default("India"),
  postal_code: z.string().min(1, "Required"),
  admin_first_name: z.string().min(1, "Required"),
  admin_last_name: z.string().min(1, "Required"),
  admin_email: z.string().email(),
  admin_password: z.string().min(8, "Must be at least 8 characters"),
});
export type OnboardHospitalFormValues = z.infer<typeof onboardHospitalSchema>;

export const branchSchema = z.object({
  name: z.string().min(1, "Required"),
  code: z.string().min(1, "Required").max(20),
  address: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  phone: z.string().min(6, "Required"),
  email: z.string().email().optional().or(z.literal("")),
});
export type BranchFormValues = z.infer<typeof branchSchema>;

export const departmentSchema = z.object({
  branch: z.string().min(1, "Select a branch"),
  name: z.string().min(1, "Required"),
  code: z.string().min(1, "Required").max(20),
  description: z.string().optional().or(z.literal("")),
});
export type DepartmentFormValues = z.infer<typeof departmentSchema>;

export const staffAssignSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional().or(z.literal("")),
  last_name: z.string().optional().or(z.literal("")),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.enum([
    "hospital_admin", "doctor", "receptionist", "nurse",
    "lab_technician", "pharmacist", "accountant",
  ]),
  branch: z.string().min(1, "Select a branch"),
  department: z.string().optional().or(z.literal("")),
});
export type StaffAssignFormValues = z.infer<typeof staffAssignSchema>;
