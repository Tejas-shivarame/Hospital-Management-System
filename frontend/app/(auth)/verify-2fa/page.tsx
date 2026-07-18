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
import { useAuthStore } from "@/store/auth.store";
import { getApiErrorMessage } from "@/lib/utils";

export default function Verify2FAPage() {
  return (
    <Suspense fallback={null}>
      <Verify2FAForm />
    </Suspense>
  );
}

function Verify2FAForm() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") ?? "";
  const [submitting, setSubmitting] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  const onSubmit = async (data: OtpFormValues) => {
    setSubmitting(true);
    try {
      const { data: res } = await authService.verify2FALogin({ email, code: data.code });
      setSession(res.data.user!, { access: res.data.access!, refresh: res.data.refresh! });
      toast.success("Welcome back.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Two-factor authentication"
      title="Confirm it's you"
      subtitle="Enter the code from your authenticator app or email."
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
          Verify and sign in
        </Button>
      </form>
    </AuthShell>
  );
}
