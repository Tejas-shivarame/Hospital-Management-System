"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus, Users } from "lucide-react";
import { RequireRole } from "@/components/admin/require-role";
import { patientService } from "@/services/patient.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function PatientsListInner() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search],
    queryFn: async () => (await patientService.list(search ? { search } : undefined)).data.data,
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Patients</p>
          <h1 className="mt-1 font-display text-3xl text-foreground">Patient records</h1>
        </div>
        <Link href="/dashboard/patients/register">
          <Button className="w-auto px-5">
            <UserPlus className="h-4 w-4" /> Register patient
          </Button>
        </Link>
      </div>

      <div className="mt-6 relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search by name, MRN, email, or phone…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {data?.results.length === 0 && (
            <p className="text-sm text-muted">No patients found.</p>
          )}
          {data?.results.map((patient) => (
            <Link
              key={patient.id}
              href={`/dashboard/patients/${patient.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{patient.user.full_name}</p>
                  <p className="text-xs text-muted">
                    {patient.mrn} · {patient.user.email}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {patient.blood_group}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientsListPage() {
  return (
    <RequireRole roles={["super_admin", "hospital_admin", "doctor", "nurse", "receptionist", "lab_technician", "pharmacist", "accountant"]}>
      <PatientsListInner />
    </RequireRole>
  );
}
