"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireRole } from "@/components/admin/require-role";
import { onboardHospitalSchema, type OnboardHospitalFormValues } from "@/lib/validations/hospital.schema";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hospitalService } from "@/services/hospital.service";
import { getApiErrorMessage } from "@/lib/utils";

function OnboardHospitalInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardHospitalFormValues>({
    resolver: zodResolver(onboardHospitalSchema),
    defaultValues: { country: "India" },
  });

  const mutation = useMutation({
    mutationFn: (values: OnboardHospitalFormValues) =>
      hospitalService.onboard({
        hospital: {
          name: values.name,
          slug: values.slug,
          registration_number: values.registration_number,
          email: values.email,
          phone: values.phone,
          address: values.address,
          city: values.city,
          state: values.state,
          country: values.country,
          postal_code: values.postal_code,
          is_active: true,
          subscription_plan: "trial",
        },
        admin_first_name: values.admin_first_name,
        admin_last_name: values.admin_last_name,
        admin_email: values.admin_email,
        admin_password: values.admin_password,
      }),
    onSuccess: () => {
      toast.success("Hospital onboarded successfully.");
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      router.push("/dashboard/admin/hospitals");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Admin</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">Onboard a new hospital</h1>
      <p className="mt-2 text-sm text-muted">
        Creates the hospital, its main branch, and its first Hospital Admin account together.
      </p>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-8 space-y-6" noValidate>
        <fieldset className="space-y-5 rounded-xl border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">Hospital details</legend>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Hospital name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" placeholder="Sunrise Multi-Specialty" {...register("name")} />
            </Field>
            <Field label="Slug" htmlFor="slug" error={errors.slug?.message} hint="lowercase-with-hyphens">
              <Input id="slug" placeholder="sunrise-multi-specialty" {...register("slug")} />
            </Field>
          </div>

          <Field label="Registration number" htmlFor="registration_number" error={errors.registration_number?.message}>
            <Input id="registration_number" placeholder="REG-0001" {...register("registration_number")} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" placeholder="info@hospital.com" {...register("email")} />
            </Field>
            <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" placeholder="9000000000" {...register("phone")} />
            </Field>
          </div>

          <Field label="Address" htmlFor="address" error={errors.address?.message}>
            <Input id="address" placeholder="1 Health Ave" {...register("address")} />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="City" htmlFor="city" error={errors.city?.message}>
              <Input id="city" placeholder="Bengaluru" {...register("city")} />
            </Field>
            <Field label="State" htmlFor="state" error={errors.state?.message}>
              <Input id="state" placeholder="Karnataka" {...register("state")} />
            </Field>
            <Field label="Postal code" htmlFor="postal_code" error={errors.postal_code?.message}>
              <Input id="postal_code" placeholder="560001" {...register("postal_code")} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-5 rounded-xl border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">First Hospital Admin</legend>

          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" htmlFor="admin_first_name" error={errors.admin_first_name?.message}>
              <Input id="admin_first_name" placeholder="Priya" {...register("admin_first_name")} />
            </Field>
            <Field label="Last name" htmlFor="admin_last_name" error={errors.admin_last_name?.message}>
              <Input id="admin_last_name" placeholder="Nair" {...register("admin_last_name")} />
            </Field>
          </div>

          <Field label="Admin email" htmlFor="admin_email" error={errors.admin_email?.message}>
            <Input id="admin_email" type="email" placeholder="admin@hospital.com" {...register("admin_email")} />
          </Field>

          <Field label="Temporary password" htmlFor="admin_password" error={errors.admin_password?.message}>
            <PasswordInput id="admin_password" placeholder="••••••••" {...register("admin_password")} />
          </Field>
        </fieldset>

        <Button type="submit" loading={mutation.isPending}>
          Onboard hospital
        </Button>
      </form>
    </div>
  );
}

export default function OnboardHospitalPage() {
  return (
    <RequireRole roles={["super_admin"]}>
      <OnboardHospitalInner />
    </RequireRole>
  );
}
