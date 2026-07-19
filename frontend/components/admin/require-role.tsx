"use client";

import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types/auth.types";
import { Loader2 } from "lucide-react";

export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: React.ReactNode;
}) {
  const { user, isLoadingUser } = useAuth();

  if (isLoadingUser) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">Not authorized</p>
        <p className="mt-2 text-sm text-muted">
          This section is only available to {roles.join(" / ").replace(/_/g, " ")}.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
