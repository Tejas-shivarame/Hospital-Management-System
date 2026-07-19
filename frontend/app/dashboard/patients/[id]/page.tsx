"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { RequireRole } from "@/components/admin/require-role";
import { patientService, patientDocumentService } from "@/services/patient.service";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/utils";

const DOCUMENT_TYPES = [
  { value: "lab_report", label: "Lab Report" },
  { value: "prescription", label: "Prescription" },
  { value: "id_proof", label: "ID Proof" },
  { value: "insurance", label: "Insurance Document" },
  { value: "discharge_summary", label: "Discharge Summary" },
  { value: "other", label: "Other" },
];

function PatientDetailInner() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("lab_report");

  const { data: patient } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => (await patientService.retrieve(id)).data.data,
  });

  const { data: documents } = useQuery({
    queryKey: ["patient-documents", id],
    queryFn: async () => (await patientDocumentService.list(id)).data.data,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => patientDocumentService.upload(id, file, title || file.name, docType),
    onSuccess: () => {
      toast.success("Document uploaded.");
      queryClient.invalidateQueries({ queryKey: ["patient-documents", id] });
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Patient record</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">
        {patient?.user.full_name ?? "Loading…"}
      </h1>
      {patient && <p className="mt-1 text-sm text-muted">{patient.mrn} · {patient.user.email}</p>}

      {patient && (
        <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 text-sm">
          <div><dt className="text-muted">Blood group</dt><dd className="font-medium">{patient.blood_group}</dd></div>
          <div><dt className="text-muted">Phone</dt><dd className="font-medium">{patient.user.phone || "—"}</dd></div>
          <div><dt className="text-muted">Emergency contact</dt><dd className="font-medium">{patient.emergency_contact_name || "—"} {patient.emergency_contact_phone && `(${patient.emergency_contact_phone})`}</dd></div>
          <div><dt className="text-muted">Insurance</dt><dd className="font-medium">{patient.insurance_provider || "—"}</dd></div>
          <div className="col-span-2"><dt className="text-muted">Known allergies</dt><dd className="font-medium">{patient.known_allergies || "None recorded"}</dd></div>
          <div className="col-span-2"><dt className="text-muted">Chronic conditions</dt><dd className="font-medium">{patient.chronic_conditions || "None recorded"}</dd></div>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl text-foreground">Documents</h2>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
          <Field label="Title" htmlFor="doc_title">
            <Input id="doc_title" placeholder="Blood test — CBC" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Type" htmlFor="doc_type">
            <Select id="doc_type" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
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
          <Button
            type="button"
            variant="outline"
            className="w-auto px-4"
            loading={uploadMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
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
              <div>
                <p className="font-medium text-foreground">{doc.title}</p>
                <p className="text-xs text-muted">
                  {DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label} · {doc.uploaded_by_name ?? "Self"}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <RequireRole roles={["super_admin", "hospital_admin", "doctor", "nurse", "receptionist", "lab_technician", "pharmacist", "accountant"]}>
      <PatientDetailInner />
    </RequireRole>
  );
}
