"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { otpSchema, type OtpFormValues } from "@/lib/validations/auth.schema";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/utils";
import type { OtpPurpose } from "@/types/auth.types";

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}

function VerifyOtpForm() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") ?? "";
  const purpose = (params.get("purpose") as OtpPurpose) ?? "email_verification";

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  const onSubmit = async (data: OtpFormValues) => {
    setSubmitting(true);
    try {
      await authService.verifyOtp({ email, code: data.code, purpose });
      toast.success("Verified. You can now sign in.");
      router.push("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await authService.resendOtp({ email, purpose });
      toast.success("A new code has been sent.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="One more step"
      title="Enter verification code"
      subtitle={`We sent a 6-digit code to ${email || "your email"}.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Verification code" htmlFor="code" error={errors.code?.message}>
          <Input
            id="code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="font-mono text-lg tracking-[0.5em]"
            {...register("code")}
          />
        </Field>

        <Button type="submit" loading={submitting}>
          Verify
        </Button>

        <Button type="button" variant="ghost" loading={resending} onClick={resend}>
          Resend code
        </Button>
      </form>
    </AuthShell>
  );
}
