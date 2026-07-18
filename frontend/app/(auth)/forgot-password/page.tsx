"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/validations/auth.schema";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setSubmitting(true);
    try {
      await authService.forgotPassword(data);
      setSent(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a link to reset it."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground">
          If that email is registered, a reset link is on its way. It expires in 1 hour.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Field label="Email address" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
          </Field>
          <Button type="submit" loading={submitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
