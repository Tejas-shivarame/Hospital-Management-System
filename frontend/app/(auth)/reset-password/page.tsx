"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/lib/validations/auth.schema";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/utils";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("This reset link is invalid. Please request a new one.");
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword({ token, ...data });
      toast.success("Password reset. Please sign in.");
      router.push("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Password reset" title="Choose a new password" subtitle="Make it something only you would know.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="New password" htmlFor="new_password" error={errors.new_password?.message} hint="8+ characters, upper/lowercase, digit, symbol">
          <PasswordInput id="new_password" placeholder="••••••••" {...register("new_password")} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm_password" error={errors.confirm_password?.message}>
          <PasswordInput id="confirm_password" placeholder="••••••••" {...register("confirm_password")} />
        </Field>
        <Button type="submit" loading={submitting}>
          Reset password
        </Button>
      </form>
    </AuthShell>
  );
}
