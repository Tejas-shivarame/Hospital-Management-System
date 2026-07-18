"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth.schema";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Enter your credentials to reach your dashboard."
      footer={
        <>
          New to Meridian?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create a patient account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((data) => login(data))} className="space-y-5" noValidate>
        <Field label="Email address" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" placeholder="••••••••" {...register("password")} />
        </Field>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isLoggingIn}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
