"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Stethoscope, UserPlus } from "lucide-react";
import { RequireRole } from "@/components/admin/require-role";
import { doctorService } from "@/services/doctor.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

function DoctorsListInner() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const canAddDoctor = user?.role === "super_admin" || user?.role === "hospital_admin";

  const { data, isLoading } = useQuery({
    queryKey: ["doctors", search],
    queryFn: async () => (await doctorService.list(search ? { search } : undefined)).data.data,
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Doctors</p>
          <h1 className="mt-1 font-display text-3xl text-foreground">Find a doctor</h1>
        </div>
        {canAddDoctor && (
          <Link href="/dashboard/doctors/create-profile">
            <Button className="w-auto px-5">
              <UserPlus className="h-4 w-4" /> Add doctor
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-6 relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search by name, license number, or qualification…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {data?.results.length === 0 && <p className="text-sm text-muted">No doctors found.</p>}
          {data?.results.map((doctor) => (
            <Link
              key={doctor.id}
              href={`/dashboard/doctors/${doctor.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Dr. {doctor.user.full_name}</p>
                  <p className="text-xs text-muted">
                    {doctor.qualification || "—"} · {doctor.experience_years} yrs experience
                    {doctor.department_name ? ` · ${doctor.department_name}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {doctor.specializations.slice(0, 2).map((s) => (
                  <span key={s.id} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    {s.name}
                  </span>
                ))}
                {!doctor.is_available_for_appointments && (
                  <span className="rounded-full bg-muted/20 px-2.5 py-1 text-xs text-muted">Unavailable</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DoctorsListPage() {
  return (
    <RequireRole
      roles={[
        "super_admin", "hospital_admin", "doctor", "nurse", "receptionist",
        "lab_technician", "pharmacist", "accountant", "patient",
      ]}
    >
      <DoctorsListInner />
    </RequireRole>
  );
}
