"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth.schema";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const { register: registerUser, isRegistering } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  return (
    <AuthShell
      eyebrow="Patient registration"
      title="Create your account"
      subtitle="Book appointments, view records, and manage bills in one place."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((data) => registerUser(data))} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" htmlFor="first_name" error={errors.first_name?.message}>
            <Input id="first_name" placeholder="Asha" {...register("first_name")} />
          </Field>
          <Field label="Last name" htmlFor="last_name" error={errors.last_name?.message}>
            <Input id="last_name" placeholder="Rao" {...register("last_name")} />
          </Field>
        </div>

        <Field label="Email address" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
        </Field>

        <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} hint="Optional, used for SMS reminders">
          <Input id="phone" placeholder="9876543210" {...register("phone")} />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="8+ characters, upper/lowercase, digit, symbol">
          <PasswordInput id="password" placeholder="••••••••" {...register("password")} />
        </Field>

        <Field label="Confirm password" htmlFor="confirm_password" error={errors.confirm_password?.message}>
          <PasswordInput id="confirm_password" placeholder="••••••••" {...register("confirm_password")} />
        </Field>

        <Button type="submit" loading={isRegistering}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
