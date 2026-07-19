"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireRole } from "@/components/admin/require-role";
import { staffAssignSchema, type StaffAssignFormValues } from "@/lib/validations/hospital.schema";
import { Field, Input, PasswordInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { branchService, departmentService, staffService } from "@/services/hospital.service";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "receptionist", label: "Receptionist" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "accountant", label: "Accountant" },
  { value: "hospital_admin", label: "Hospital Admin" },
];

function StaffAssignInner() {
  const { user } = useAuth();

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffAssignFormValues>({ resolver: zodResolver(staffAssignSchema) });

  const mutation = useMutation({
    mutationFn: (values: StaffAssignFormValues) =>
      staffService.assign({
        ...values,
        department: values.department || undefined,
        hospital: user?.role === "super_admin" ? user.hospital ?? undefined : undefined,
      }),
    onSuccess: () => {
      toast.success("Staff member assigned successfully.");
      reset();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Admin</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">Assign staff</h1>
      <p className="mt-2 text-sm text-muted">
        Create a new staff account, or reassign an existing user's role, branch, and department.
      </p>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-8 space-y-5" noValidate>
        <Field label="Email" htmlFor="s_email" error={errors.email?.message}>
          <Input id="s_email" type="email" placeholder="staff@hospital.com" {...register("email")} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" htmlFor="s_first" hint="Required for new accounts" error={errors.first_name?.message}>
            <Input id="s_first" {...register("first_name")} />
          </Field>
          <Field label="Last name" htmlFor="s_last" error={errors.last_name?.message}>
            <Input id="s_last" {...register("last_name")} />
          </Field>
        </div>

        <Field label="Temporary password" htmlFor="s_password" hint="Required for new accounts" error={errors.password?.message}>
          <PasswordInput id="s_password" placeholder="••••••••" {...register("password")} />
        </Field>

        <Field label="Role" htmlFor="s_role" error={errors.role?.message}>
          <Select id="s_role" {...register("role")}>
            <option value="">Select a role</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Branch" htmlFor="s_branch" error={errors.branch?.message}>
          <Select id="s_branch" {...register("branch")}>
            <option value="">Select a branch</option>
            {branches?.results.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Department" htmlFor="s_department" hint="Optional" error={errors.department?.message}>
          <Select id="s_department" {...register("department")}>
            <option value="">No department</option>
            {departments?.results.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>

        <Button type="submit" loading={mutation.isPending}>
          Assign staff member
        </Button>
      </form>
    </div>
  );
}

export default function StaffAssignPage() {
  return (
    <RequireRole roles={["super_admin", "hospital_admin"]}>
      <StaffAssignInner />
    </RequireRole>
  );
}
