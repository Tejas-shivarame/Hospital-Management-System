"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, isLoadingUser, logout } = useAuth();

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

      <p className="mt-8 text-sm text-muted">
        This is a placeholder — Module 2 (Patient Management) will build out the real dashboard.
      </p>
    </div>
  );
}
