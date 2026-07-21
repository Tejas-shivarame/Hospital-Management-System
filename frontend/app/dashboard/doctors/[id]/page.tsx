"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, GraduationCap, Languages, Stethoscope } from "lucide-react";
import { RequireRole } from "@/components/admin/require-role";
import { doctorService, doctorAvailabilityService } from "@/services/doctor.service";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function DoctorDetailInner() {
  const { id } = useParams<{ id: string }>();

  const { data: doctor } = useQuery({
    queryKey: ["doctor", id],
    queryFn: async () => (await doctorService.retrieve(id)).data.data,
  });

  const { data: availability } = useQuery({
    queryKey: ["doctor-availability", id],
    queryFn: async () => (await doctorAvailabilityService.list(id)).data.data,
    enabled: !!id,
  });

  if (!doctor) return <div className="px-6 py-16 text-sm text-muted">Loading…</div>;

  const slotsByDay = DAYS.map((_, dayIndex) =>
    availability?.results.filter((slot) => slot.day_of_week === dayIndex && slot.is_active) ?? []
  );

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Doctor</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">Dr. {doctor.user.full_name}</h1>
      <p className="mt-1 text-sm text-muted">
        {doctor.qualification || "—"} {doctor.department_name && `· ${doctor.department_name}`} {doctor.branch_name && `· ${doctor.branch_name}`}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {doctor.specializations.map((s) => (
          <span key={s.id} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {s.name}
          </span>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 text-sm">
        <div className="flex items-start gap-2">
          <Stethoscope className="mt-0.5 h-4 w-4 text-muted" />
          <div>
            <p className="text-muted">Experience</p>
            <p className="font-medium">{doctor.experience_years} years</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <GraduationCap className="mt-0.5 h-4 w-4 text-muted" />
          <div>
            <p className="text-muted">Consultation fee</p>
            <p className="font-medium">₹{doctor.consultation_fee}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Languages className="mt-0.5 h-4 w-4 text-muted" />
          <div>
            <p className="text-muted">Languages</p>
            <p className="font-medium">{doctor.languages_spoken || "—"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 text-muted" />
          <div>
            <p className="text-muted">Slot duration</p>
            <p className="font-medium">{doctor.consultation_duration_minutes} min</p>
          </div>
        </div>
      </div>

      {doctor.bio && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-foreground">About</h2>
          <p className="mt-2 text-sm text-muted">{doctor.bio}</p>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl text-foreground">Weekly availability</h2>
        <div className="mt-4 grid gap-2">
          {slotsByDay.every((slots) => slots.length === 0) && (
            <p className="text-sm text-muted">No availability set yet.</p>
          )}
          {DAYS.map((day, i) =>
            slotsByDay[i].length > 0 ? (
              <div key={day} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm">
                <span className="font-medium text-foreground">{day}</span>
                <span className="text-muted">
                  {slotsByDay[i].map((s) => `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`).join(", ")}
                </span>
              </div>
            ) : null
          )}
        </div>
      </section>
    </div>
  );
}

export default function DoctorDetailPage() {
  return (
    <RequireRole
      roles={[
        "super_admin", "hospital_admin", "doctor", "nurse", "receptionist",
        "lab_technician", "pharmacist", "accountant", "patient",
      ]}
    >
      <DoctorDetailInner />
    </RequireRole>
  );
}
