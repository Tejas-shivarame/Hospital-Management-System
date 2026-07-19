"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireRole } from "@/components/admin/require-role";
import { patientRegistrationSchema, type PatientRegistrationFormValues } from "@/lib/validations/patient.schema";
import { Field, Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { patientService } from "@/services/patient.service";
import { branchService } from "@/services/hospital.service";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

function RegisterPatientInner() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: branches } = useQuery({
    queryKey: ["branches", "mine"],
    queryFn: async () => (await branchService.list(user?.hospital ? { hospital: user.hospital } : {})).data.data,
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientRegistrationFormValues>({ resolver: zodResolver(patientRegistrationSchema) });

  const mutation = useMutation({
    mutationFn: (values: PatientRegistrationFormValues) => patientService.register(values),
    onSuccess: (res) => {
      toast.success("Patient registered. A password-setup link has been sent to their email.");
      router.push(`/dashboard/patients/${res.data.data.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Patients</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">Register a patient</h1>
      <p className="mt-2 text-sm text-muted">For walk-in or phone registration at the front desk.</p>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-8 space-y-6" noValidate>
        <fieldset className="space-y-5 rounded-xl border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">Basic details</legend>

          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" htmlFor="p_first" error={errors.first_name?.message}>
              <Input id="p_first" {...register("first_name")} />
            </Field>
            <Field label="Last name" htmlFor="p_last" error={errors.last_name?.message}>
              <Input id="p_last" {...register("last_name")} />
            </Field>
          </div>

          <Field label="Email" htmlFor="p_email" error={errors.email?.message}>
            <Input id="p_email" type="email" {...register("email")} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" htmlFor="p_phone" error={errors.phone?.message}>
              <Input id="p_phone" {...register("phone")} />
            </Field>
            <Field label="Date of birth" htmlFor="p_dob" error={errors.date_of_birth?.message}>
              <Input id="p_dob" type="date" {...register("date_of_birth")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Gender" htmlFor="p_gender" error={errors.gender?.message}>
              <Select id="p_gender" {...register("gender")}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Branch" htmlFor="p_branch" error={errors.branch?.message}>
              <Select id="p_branch" {...register("branch")}>
                <option value="">Select a branch</option>
                {branches?.results.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Address" htmlFor="p_address" error={errors.address?.message}>
            <Input id="p_address" {...register("address")} />
          </Field>
        </fieldset>

        <fieldset className="space-y-5 rounded-xl border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">Clinical & emergency info</legend>

          <Field label="Blood group" htmlFor="p_blood" error={errors.blood_group?.message}>
            <Select id="p_blood" {...register("blood_group")}>
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Emergency contact name" htmlFor="p_ec_name" error={errors.emergency_contact_name?.message}>
              <Input id="p_ec_name" {...register("emergency_contact_name")} />
            </Field>
            <Field label="Emergency contact phone" htmlFor="p_ec_phone" error={errors.emergency_contact_phone?.message}>
              <Input id="p_ec_phone" {...register("emergency_contact_phone")} />
            </Field>
          </div>

          <Field label="Known allergies" htmlFor="p_allergies" error={errors.known_allergies?.message}>
            <Textarea id="p_allergies" {...register("known_allergies")} />
          </Field>

          <Field label="Chronic conditions" htmlFor="p_chronic" error={errors.chronic_conditions?.message}>
            <Textarea id="p_chronic" {...register("chronic_conditions")} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Insurance provider" htmlFor="p_ins_provider" error={errors.insurance_provider?.message}>
              <Input id="p_ins_provider" {...register("insurance_provider")} />
            </Field>
            <Field label="Policy number" htmlFor="p_ins_policy" error={errors.insurance_policy_number?.message}>
              <Input id="p_ins_policy" {...register("insurance_policy_number")} />
            </Field>
          </div>
        </fieldset>

        <Button type="submit" loading={mutation.isPending}>
          Register patient
        </Button>
      </form>
    </div>
  );
}

export default function RegisterPatientPage() {
  return (
    <RequireRole roles={["super_admin", "hospital_admin", "receptionist", "nurse"]}>
      <RegisterPatientInner />
    </RequireRole>
  );
}
