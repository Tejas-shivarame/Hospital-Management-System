"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { RequireRole } from "@/components/admin/require-role";
import { patientClinicalUpdateSchema, type PatientClinicalUpdateFormValues } from "@/lib/validations/patient.schema";
import { Field, Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { patientService, patientDocumentService } from "@/services/patient.service";
import { getApiErrorMessage } from "@/lib/utils";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

function MyProfileInner() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");

  const { data: patient } = useQuery({
    queryKey: ["patient", "me"],
    queryFn: async () => (await patientService.me()).data.data,
  });

  const { data: documents } = useQuery({
    queryKey: ["patient-documents", patient?.id],
    queryFn: async () => (await patientDocumentService.list(patient!.id)).data.data,
    enabled: !!patient,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientClinicalUpdateFormValues>({
    resolver: zodResolver(patientClinicalUpdateSchema),
    values: patient
      ? {
          blood_group: patient.blood_group,
          emergency_contact_name: patient.emergency_contact_name,
          emergency_contact_phone: patient.emergency_contact_phone,
          emergency_contact_relation: patient.emergency_contact_relation,
          marital_status: patient.marital_status,
          occupation: patient.occupation,
          known_allergies: patient.known_allergies,
          chronic_conditions: patient.chronic_conditions,
          insurance_provider: patient.insurance_provider,
          insurance_policy_number: patient.insurance_policy_number,
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (values: PatientClinicalUpdateFormValues) => patientService.updateMe(values),
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["patient", "me"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => patientDocumentService.upload(patient!.id, file, title || file.name, "other"),
    onSuccess: () => {
      toast.success("Document uploaded.");
      queryClient.invalidateQueries({ queryKey: ["patient-documents", patient?.id] });
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!patient) return <div className="px-6 py-16 text-sm text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">My profile</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">{patient.user.full_name}</h1>
      <p className="mt-1 text-sm text-muted">{patient.mrn} · {patient.user.email}</p>

      <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="mt-8 space-y-5 rounded-xl border border-border bg-surface p-5" noValidate>
        <h2 className="text-sm font-semibold text-foreground">Clinical & emergency info</h2>

        <Field label="Blood group" htmlFor="m_blood" error={errors.blood_group?.message}>
          <Select id="m_blood" {...register("blood_group")}>
            {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Emergency contact name" htmlFor="m_ec_name" error={errors.emergency_contact_name?.message}>
            <Input id="m_ec_name" {...register("emergency_contact_name")} />
          </Field>
          <Field label="Emergency contact phone" htmlFor="m_ec_phone" error={errors.emergency_contact_phone?.message}>
            <Input id="m_ec_phone" {...register("emergency_contact_phone")} />
          </Field>
        </div>

        <Field label="Known allergies" htmlFor="m_allergies" error={errors.known_allergies?.message}>
          <Textarea id="m_allergies" {...register("known_allergies")} />
        </Field>

        <Field label="Chronic conditions" htmlFor="m_chronic" error={errors.chronic_conditions?.message}>
          <Textarea id="m_chronic" {...register("chronic_conditions")} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Insurance provider" htmlFor="m_ins_provider" error={errors.insurance_provider?.message}>
            <Input id="m_ins_provider" {...register("insurance_provider")} />
          </Field>
          <Field label="Policy number" htmlFor="m_ins_policy" error={errors.insurance_policy_number?.message}>
            <Input id="m_ins_policy" {...register("insurance_policy_number")} />
          </Field>
        </div>

        <Button type="submit" loading={updateMutation.isPending}>Save changes</Button>
      </form>

      <section className="mt-10">
        <h2 className="font-display text-xl text-foreground">My documents</h2>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
          <Field label="Title" htmlFor="my_doc_title">
            <Input id="my_doc_title" placeholder="Insurance card" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <input
            ref={fileInputRef}
            type="file"
            className="text-sm text-muted"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }}
          />
          <Button type="button" variant="outline" className="w-auto px-4" loading={uploadMutation.isPending} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          {documents?.results.length === 0 && <p className="text-sm text-muted">No documents uploaded yet.</p>}
          {documents?.results.map((doc) => (
            <a
              key={doc.id}
              href={doc.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-sm transition-colors hover:border-primary/40"
            >
              <FileText className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">{doc.title}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function MyProfilePage() {
  return (
    <RequireRole roles={["patient"]}>
      <MyProfileInner />
    </RequireRole>
  );
}
