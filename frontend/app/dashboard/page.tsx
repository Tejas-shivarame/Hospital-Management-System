"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, isLoadingUser, logout } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "hospital_admin";

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl text-foreground">
            {isLoadingUser ? "Loading…" : `Welcome, ${user?.first_name ?? ""}`}
          </h1>
        </div>
        <Button variant="outline" className="w-auto px-5" onClick={logout}>
          Sign out
        </Button>
      </div>

      {user && (
        <dl className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 text-sm">
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Role</dt>
            <dd className="font-medium capitalize">{user.role.replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-muted">Email verified</dt>
            <dd className="font-medium">{user.is_verified ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-muted">2FA enabled</dt>
            <dd className="font-medium">{user.is_2fa_enabled ? "Yes" : "No"}</dd>
          </div>
        </dl>
      )}

      {isAdmin && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard/admin/hospitals">
            <Button variant="outline" className="w-auto px-5">Manage hospitals</Button>
          </Link>
          <Link href="/dashboard/admin/staff">
            <Button variant="outline" className="w-auto px-5">Assign staff</Button>
          </Link>
          <Link href="/dashboard/patients">
            <Button variant="outline" className="w-auto px-5">Patient records</Button>
          </Link>
          <Link href="/dashboard/doctors">
            <Button variant="outline" className="w-auto px-5">Doctors</Button>
          </Link>
        </div>
      )}

      {["nurse", "receptionist", "lab_technician", "pharmacist", "accountant"].includes(user?.role ?? "") && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard/patients">
            <Button variant="outline" className="w-auto px-5">Patient records</Button>
          </Link>
          <Link href="/dashboard/doctors">
            <Button variant="outline" className="w-auto px-5">Doctors</Button>
          </Link>
          {(user?.role === "receptionist" || user?.role === "nurse") && (
            <Link href="/dashboard/patients/register">
              <Button variant="outline" className="w-auto px-5">Register patient</Button>
            </Link>
          )}
        </div>
      )}

      {user?.role === "doctor" && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard/patients">
            <Button variant="outline" className="w-auto px-5">Patient records</Button>
          </Link>
          <Link href="/dashboard/my-availability">
            <Button variant="outline" className="w-auto px-5">My availability</Button>
          </Link>
        </div>
      )}

      {user?.role === "patient" && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard/my-profile">
            <Button variant="outline" className="w-auto px-5">My profile & documents</Button>
          </Link>
          <Link href="/dashboard/doctors">
            <Button variant="outline" className="w-auto px-5">Find a doctor</Button>
          </Link>
        </div>
      )}

      <p className="mt-8 text-sm text-muted">
        This is a placeholder — Module 5 (Appointment Scheduling) will build out the real dashboard.
      </p>
    </div>
  );
}
