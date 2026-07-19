"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { RequireRole } from "@/components/admin/require-role";
import { branchSchema, type BranchFormValues, departmentSchema, type DepartmentFormValues } from "@/lib/validations/hospital.schema";
import { Field, Input } from "@/components/ui/input";
import { Textarea, Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { hospitalService, branchService, departmentService } from "@/services/hospital.service";
import { getApiErrorMessage } from "@/lib/utils";

function HospitalDetailInner() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [showDeptForm, setShowDeptForm] = useState(false);

  const { data: hospital } = useQuery({
    queryKey: ["hospital", id],
    queryFn: async () => (await hospitalService.retrieve(id)).data.data,
  });

  const { data: branches } = useQuery({
    queryKey: ["branches", id],
    queryFn: async () => (await branchService.list({ hospital: id })).data.data,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", id],
    queryFn: async () => (await departmentService.list({ hospital: id })).data.data,
  });

  const branchForm = useForm<BranchFormValues>({ resolver: zodResolver(branchSchema) });
  const deptForm = useForm<DepartmentFormValues>({ resolver: zodResolver(departmentSchema) });

  const createBranch = useMutation({
    mutationFn: (values: BranchFormValues) => branchService.create({ ...values, hospital: id }),
    onSuccess: () => {
      toast.success("Branch created.");
      queryClient.invalidateQueries({ queryKey: ["branches", id] });
      queryClient.invalidateQueries({ queryKey: ["hospital", id] });
      branchForm.reset();
      setShowBranchForm(false);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const createDepartment = useMutation({
    mutationFn: (values: DepartmentFormValues) => departmentService.create(values),
    onSuccess: () => {
      toast.success("Department created.");
      queryClient.invalidateQueries({ queryKey: ["departments", id] });
      deptForm.reset();
      setShowDeptForm(false);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Admin</p>
      <h1 className="mt-1 font-display text-3xl text-foreground">{hospital?.name ?? "Loading…"}</h1>
      {hospital && <p className="mt-1 text-sm text-muted">{hospital.city}, {hospital.state} · {hospital.registration_number}</p>}

      {/* Branches */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">Branches</h2>
          <Button variant="outline" className="w-auto px-4" onClick={() => setShowBranchForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Add branch
          </Button>
        </div>

        {showBranchForm && (
          <form
            onSubmit={branchForm.handleSubmit((v) => createBranch.mutate(v))}
            className="mt-4 space-y-4 rounded-xl border border-border bg-surface p-5"
            noValidate
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" htmlFor="b_name" error={branchForm.formState.errors.name?.message}>
                <Input id="b_name" {...branchForm.register("name")} />
              </Field>
              <Field label="Code" htmlFor="b_code" error={branchForm.formState.errors.code?.message}>
                <Input id="b_code" placeholder="NW01" {...branchForm.register("code")} />
              </Field>
            </div>
            <Field label="Address" htmlFor="b_address" error={branchForm.formState.errors.address?.message}>
              <Input id="b_address" {...branchForm.register("address")} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="City" htmlFor="b_city" error={branchForm.formState.errors.city?.message}>
                <Input id="b_city" {...branchForm.register("city")} />
              </Field>
              <Field label="State" htmlFor="b_state" error={branchForm.formState.errors.state?.message}>
                <Input id="b_state" {...branchForm.register("state")} />
              </Field>
              <Field label="Phone" htmlFor="b_phone" error={branchForm.formState.errors.phone?.message}>
                <Input id="b_phone" {...branchForm.register("phone")} />
              </Field>
            </div>
            <Button type="submit" loading={createBranch.isPending}>Create branch</Button>
          </form>
        )}

        <div className="mt-4 grid gap-3">
          {branches?.results.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 text-sm">
              <div>
                <p className="font-medium text-foreground">{b.name} {b.is_main_branch && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Main</span>}</p>
                <p className="text-xs text-muted">{b.code} · {b.city}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">Departments</h2>
          <Button variant="outline" className="w-auto px-4" onClick={() => setShowDeptForm((s) => !s)}>
            <Plus className="h-4 w-4" /> Add department
          </Button>
        </div>

        {showDeptForm && (
          <form
            onSubmit={deptForm.handleSubmit((v) => createDepartment.mutate(v))}
            className="mt-4 space-y-4 rounded-xl border border-border bg-surface p-5"
            noValidate
          >
            <Field label="Branch" htmlFor="d_branch" error={deptForm.formState.errors.branch?.message}>
              <Select id="d_branch" {...deptForm.register("branch")}>
                <option value="">Select a branch</option>
                {branches?.results.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" htmlFor="d_name" error={deptForm.formState.errors.name?.message}>
                <Input id="d_name" placeholder="Cardiology" {...deptForm.register("name")} />
              </Field>
              <Field label="Code" htmlFor="d_code" error={deptForm.formState.errors.code?.message}>
                <Input id="d_code" placeholder="CARD" {...deptForm.register("code")} />
              </Field>
            </div>
            <Field label="Description" htmlFor="d_description" error={deptForm.formState.errors.description?.message}>
              <Textarea id="d_description" {...deptForm.register("description")} />
            </Field>
            <Button type="submit" loading={createDepartment.isPending}>Create department</Button>
          </form>
        )}

        <div className="mt-4 grid gap-3">
          {departments?.results.map((d) => (
            <div key={d.id} className="rounded-lg border border-border bg-surface p-4 text-sm">
              <p className="font-medium text-foreground">{d.name}</p>
              <p className="text-xs text-muted">
                {d.code}{d.head_of_department_name ? ` · Head: ${d.head_of_department_name}` : ""}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HospitalDetailPage() {
  return (
    <RequireRole roles={["super_admin", "hospital_admin"]}>
      <HospitalDetailInner />
    </RequireRole>
  );
}
