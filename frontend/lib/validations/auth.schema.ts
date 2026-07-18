import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Must be at least 8 characters")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/\d/, "Must include a digit")
  .regex(/[!@#$%^&*(),.?":{}|<>_\-+=]/, "Must include a special character");

export const registerSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z
      .string()
      .regex(/^\d{10}$/, "Enter a 10-digit phone number")
      .optional()
      .or(z.literal("")),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const otpSchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code"),
});

export type OtpFormValues = z.infer<typeof otpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
