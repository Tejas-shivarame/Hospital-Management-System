import { z } from "zod";

export const doctorProfileCreateSchema = z.object({
  user_id: z.string().min(1, "Select a user"),
  branch: z.string().min(1, "Select a branch"),
  department: z.string().optional().or(z.literal("")),
  license_number: z.string().min(1, "Required"),
  qualification: z.string().optional().or(z.literal("")),
  experience_years: z.coerce.number().min(0).default(0),
  consultation_fee: z.coerce.number().min(0).default(0),
  consultation_duration_minutes: z.coerce.number().min(5).default(15),
  bio: z.string().optional().or(z.literal("")),
  languages_spoken: z.string().optional().or(z.literal("")),
});
export type DoctorProfileCreateFormValues = z.infer<typeof doctorProfileCreateSchema>;

export const doctorProfileUpdateSchema = z.object({
  qualification: z.string().optional().or(z.literal("")),
  experience_years: z.coerce.number().min(0).optional(),
  consultation_fee: z.coerce.number().min(0).optional(),
  consultation_duration_minutes: z.coerce.number().min(5).optional(),
  bio: z.string().optional().or(z.literal("")),
  languages_spoken: z.string().optional().or(z.literal("")),
  is_available_for_appointments: z.boolean().optional(),
});
export type DoctorProfileUpdateFormValues = z.infer<typeof doctorProfileUpdateSchema>;

export const availabilitySlotSchema = z
  .object({
    branch: z.string().min(1, "Select a branch"),
    day_of_week: z.coerce.number().min(0).max(6),
    start_time: z.string().min(1, "Required"),
    end_time: z.string().min(1, "Required"),
  })
  .refine((d) => d.start_time < d.end_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });
export type AvailabilitySlotFormValues = z.infer<typeof availabilitySlotSchema>;

export const timeOffSchema = z
  .object({
    start_date: z.string().min(1, "Required"),
    end_date: z.string().min(1, "Required"),
    reason: z.string().optional().or(z.literal("")),
  })
  .refine((d) => d.start_date <= d.end_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });
export type TimeOffFormValues = z.infer<typeof timeOffSchema>;
