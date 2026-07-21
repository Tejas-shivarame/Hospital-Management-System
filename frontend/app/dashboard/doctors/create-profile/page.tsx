"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RequireRole } from "@/components/admin/require-role";
import {
  doctorProfileCreateSchema, type DoctorProfileCreateFormValues,
} from "@/lib/validations/doctor.schema";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { staffService } from "@/services/hospital.service";
import { branchService, departmentService } from "@/services/hospital.service";
import { doctorService, specializationService } from "@/services/doctor.service";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils";

function AddDoctorInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [accountFields, setAccountFields] = useState({ email: "", first_name: "", last_name: "", password: "" });
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);

  const { data: branches } = useQuery({
    queryKey: ["branches", "mine"],
    queryFn: async () => (await branchService.list(user?.hospital ? { hospital: user.hospital } : {})).data.data,
    enabled: !!user,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", "mine"],
    queryFn: async () => (await departmentService.list(user?.hospital ? { hospital: user.hospital } : {})).data.data,
    enabled: !!user,
  });

  const { data: specializations } = useQuery({
    queryKey: ["specializations"],
    queryFn: async () => (await specializationService.list()).data.data,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DoctorProfileCreateFormValues>({ resolver: zodResolver(doctorProfileCreateSchema) });

  const mutation = useMutation({
    mutationFn: async (values: DoctorProfileCreateFormValues) => {
      if (!accountFields.email || !accountFields.first_name || !accountFields.last_name || !accountFields.password) {
        throw new Error("Please fill in the doctor's account details.");
      }
      const staffRes = await staffService.assign({
        email: accountFields.email,
        first_name: accountFields.first_name,
        last_name: accountFields.last_name,
        password: accountFields.password,
        role: "doctor",
        branch: values.branch,
        department: values.department || undefined,
        hospital: user?.role === "super_admin" ? user.hospital ?? undefined : undefined,
      });
      const newUserId = staffRes.data.data.id;

      return doctorService.createProfile({
        user_id: newUserId,
        branch: values.branch,
        department: values.department || undefined,
        license_number: values.license_number,
        qualification: values.qualification,
        experience_years: values.experience_years,
        consultation_fee: String(values.consultation_fee),
        consultation_duration_minutes: values.consultation_duration_minutes,
        bio: values.bio,
        languages_spoken: values.languages_spoken,
        specialization_ids: selectedSpecializations,
        hospital: user?.role === "super_admin" ? user.hospital ?? undefined : undefined,
      });
    },
    onSuccess: (res) => {
      toast.success("Doctor added successfully.");
      router.push(`/dashboard/doctors/${res.data.data.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const toggleSpecialization = (id: string) => {
    setSelectedSpecializations((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Doctors</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">Add a doctor</h1>
      <p className="mt-2 text-sm text-muted">Creates the doctor&apos;s account and their clinical profile together.</p>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-8 space-y-6" noValidate>
        <fieldset className="space-y-5 rounded-xl border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">Account</legend>

          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" htmlFor="d_first">
              <Input id="d_first" value={accountFields.first_name} onChange={(e) => setAccountFields((s) => ({ ...s, first_name: e.target.value }))} />
            </Field>
            <Field label="Last name" htmlFor="d_last">
              <Input id="d_last" value={accountFields.last_name} onChange={(e) => setAccountFields((s) => ({ ...s, last_name: e.target.value }))} />
            </Field>
          </div>

          <Field label="Email" htmlFor="d_email">
            <Input id="d_email" type="email" value={accountFields.email} onChange={(e) => setAccountFields((s) => ({ ...s, email: e.target.value }))} />
          </Field>

          <Field label="Temporary password" htmlFor="d_password">
            <PasswordInput id="d_password" value={accountFields.password} onChange={(e) => setAccountFields((s) => ({ ...s, password: e.target.value }))} />
          </Field>
        </fieldset>

        <fieldset className="space-y-5 rounded-xl border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">Assignment & credentials</legend>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Branch" htmlFor="d_branch" error={errors.branch?.message}>
              <Select id="d_branch" {...register("branch")}>
                <option value="">Select a branch</option>
                {branches?.results.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Department" htmlFor="d_department" hint="Optional" error={errors.department?.message}>
              <Select id="d_department" {...register("department")}>
                <option value="">No department</option>
                {departments?.results.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="License number" htmlFor="d_license" error={errors.license_number?.message}>
            <Input id="d_license" placeholder="MCI-12345" {...register("license_number")} />
          </Field>

          <Field label="Qualification" htmlFor="d_qual" error={errors.qualification?.message}>
            <Input id="d_qual" placeholder="MBBS, MD (Cardiology)" {...register("qualification")} />
          </Field>

          <div>
            <p className="text-sm font-medium text-foreground">Specializations</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {specializations?.results.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleSpecialization(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedSpecializations.includes(s.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted hover:border-primary/40"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-5 rounded-xl border border-border bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-foreground">Practice details</legend>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Experience (yrs)" htmlFor="d_exp" error={errors.experience_years?.message}>
              <Input id="d_exp" type="number" min={0} {...register("experience_years")} />
            </Field>
            <Field label="Consultation fee" htmlFor="d_fee" error={errors.consultation_fee?.message}>
              <Input id="d_fee" type="number" min={0} step="0.01" {...register("consultation_fee")} />
            </Field>
            <Field label="Slot duration (min)" htmlFor="d_duration" error={errors.consultation_duration_minutes?.message}>
              <Input id="d_duration" type="number" min={5} {...register("consultation_duration_minutes")} />
            </Field>
          </div>

          <Field label="Languages spoken" htmlFor="d_lang" hint="Comma-separated" error={errors.languages_spoken?.message}>
            <Input id="d_lang" placeholder="English, Hindi, Kannada" {...register("languages_spoken")} />
          </Field>

          <Field label="Bio" htmlFor="d_bio" error={errors.bio?.message}>
            <Textarea id="d_bio" {...register("bio")} />
          </Field>
        </fieldset>

        <Button type="submit" loading={mutation.isPending}>
          Add doctor
        </Button>
      </form>
    </div>
  );
}

export default function AddDoctorPage() {
  return (
    <RequireRole roles={["super_admin", "hospital_admin"]}>
      <AddDoctorInner />
    </RequireRole>
  );
}
