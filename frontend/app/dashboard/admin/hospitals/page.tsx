"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { RequireRole } from "@/components/admin/require-role";
import { hospitalService } from "@/services/hospital.service";
import { Button } from "@/components/ui/button";

function HospitalsListInner() {
  const { data, isLoading } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => (await hospitalService.list()).data.data,
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="mt-1 font-display text-3xl text-foreground">Hospitals</h1>
        </div>
        <Link href="/dashboard/admin/hospitals/onboard">
          <Button className="w-auto px-5">
            <Plus className="h-4 w-4" /> Onboard hospital
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-8 grid gap-4">
          {data?.results.length === 0 && (
            <p className="text-sm text-muted">No hospitals yet. Onboard your first one to get started.</p>
          )}
          {data?.results.map((hospital) => (
            <Link
              key={hospital.id}
              href={`/dashboard/admin/hospitals/${hospital.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{hospital.name}</p>
                  <p className="text-xs text-muted">
                    {hospital.city}, {hospital.state} · {hospital.branch_count} branch
                    {hospital.branch_count === 1 ? "" : "es"}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  hospital.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                }`}
              >
                {hospital.is_active ? "Active" : "Inactive"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HospitalsListPage() {
  return (
    <RequireRole roles={["super_admin", "hospital_admin"]}>
      <HospitalsListInner />
    </RequireRole>
  );
}
