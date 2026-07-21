"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { RequireRole } from "@/components/admin/require-role";
import { availabilitySlotSchema, type AvailabilitySlotFormValues, timeOffSchema, type TimeOffFormValues } from "@/lib/validations/doctor.schema";
import { Field, Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { doctorService, doctorAvailabilityService, doctorTimeOffService } from "@/services/doctor.service";
import { getApiErrorMessage } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function MyAvailabilityInner() {
  const queryClient = useQueryClient();

  const { data: doctor } = useQuery({
    queryKey: ["doctor", "me"],
    queryFn: async () => (await doctorService.me()).data.data,
  });

  const { data: availability } = useQuery({
    queryKey: ["doctor-availability", doctor?.id],
    queryFn: async () => (await doctorAvailabilityService.list(doctor!.id)).data.data,
    enabled: !!doctor,
  });

  const { data: timeOff } = useQuery({
    queryKey: ["doctor-time-off", doctor?.id],
    queryFn: async () => (await doctorTimeOffService.list(doctor!.id)).data.data,
    enabled: !!doctor,
  });

  const slotForm = useForm<AvailabilitySlotFormValues>({ resolver: zodResolver(availabilitySlotSchema) });
  const timeOffForm = useForm<TimeOffFormValues>({ resolver: zodResolver(timeOffSchema) });

  const addSlot = useMutation({
    mutationFn: (values: AvailabilitySlotFormValues) => doctorAvailabilityService.create(values),
    onSuccess: () => {
      toast.success("Availability slot added.");
      queryClient.invalidateQueries({ queryKey: ["doctor-availability", doctor?.id] });
      slotForm.reset();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const removeSlot = useMutation({
    mutationFn: (id: string) => doctorAvailabilityService.delete(id),
    onSuccess: () => {
      toast.success("Slot removed.");
      queryClient.invalidateQueries({ queryKey: ["doctor-availability", doctor?.id] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const addTimeOff = useMutation({
    mutationFn: (values: TimeOffFormValues) => doctorTimeOffService.create(values),
    onSuccess: () => {
      toast.success("Time off recorded.");
      queryClient.invalidateQueries({ queryKey: ["doctor-time-off", doctor?.id] });
      timeOffForm.reset();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const removeTimeOff = useMutation({
    mutationFn: (id: string) => doctorTimeOffService.delete(id),
    onSuccess: () => {
      toast.success("Time off removed.");
      queryClient.invalidateQueries({ queryKey: ["doctor-time-off", doctor?.id] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!doctor) return <div className="px-6 py-16 text-sm text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">My schedule</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">Availability</h1>
      <p className="mt-2 text-sm text-muted">Set your recurring weekly hours and block out time off.</p>

      <section className="mt-8">
        <h2 className="font-display text-xl text-foreground">Weekly hours</h2>

        <form
          onSubmit={slotForm.handleSubmit((v) => addSlot.mutate({ ...v, branch: doctor.branch }))}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
          noValidate
        >
          <Field label="Day" htmlFor="s_day" error={slotForm.formState.errors.day_of_week?.message}>
            <Select id="s_day" {...slotForm.register("day_of_week")}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Start" htmlFor="s_start" error={slotForm.formState.errors.start_time?.message}>
            <Input id="s_start" type="time" {...slotForm.register("start_time")} />
          </Field>
          <Field label="End" htmlFor="s_end" error={slotForm.formState.errors.end_time?.message}>
            <Input id="s_end" type="time" {...slotForm.register("end_time")} />
          </Field>
          <input type="hidden" {...slotForm.register("branch")} value={doctor.branch} />
          <Button type="submit" variant="outline" className="w-auto px-4" loading={addSlot.isPending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>

        <div className="mt-4 grid gap-2">
          {availability?.results.length === 0 && <p className="text-sm text-muted">No slots yet.</p>}
          {availability?.results.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm">
              <span className="font-medium text-foreground">
                {slot.day_of_week_display} · {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
              </span>
              <button onClick={() => removeSlot.mutate(slot.id)} className="text-muted hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl text-foreground">Time off</h2>

        <form
          onSubmit={timeOffForm.handleSubmit((v) => addTimeOff.mutate(v))}
          className="mt-4 space-y-4 rounded-xl border border-border bg-surface p-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date" htmlFor="t_start" error={timeOffForm.formState.errors.start_date?.message}>
              <Input id="t_start" type="date" {...timeOffForm.register("start_date")} />
            </Field>
            <Field label="End date" htmlFor="t_end" error={timeOffForm.formState.errors.end_date?.message}>
              <Input id="t_end" type="date" {...timeOffForm.register("end_date")} />
            </Field>
          </div>
          <Field label="Reason" htmlFor="t_reason" hint="Optional" error={timeOffForm.formState.errors.reason?.message}>
            <Textarea id="t_reason" {...timeOffForm.register("reason")} />
          </Field>
          <Button type="submit" variant="outline" className="w-auto px-4" loading={addTimeOff.isPending}>
            <Plus className="h-4 w-4" /> Add time off
          </Button>
        </form>

        <div className="mt-4 grid gap-2">
          {timeOff?.results.length === 0 && <p className="text-sm text-muted">No time off recorded.</p>}
          {timeOff?.results.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm">
              <span>
                <span className="font-medium text-foreground">{t.start_date} → {t.end_date}</span>
                {t.reason && <span className="ml-2 text-muted">{t.reason}</span>}
              </span>
              <button onClick={() => removeTimeOff.mutate(t.id)} className="text-muted hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function MyAvailabilityPage() {
  return (
    <RequireRole roles={["doctor"]}>
      <MyAvailabilityInner />
    </RequireRole>
  );
}
