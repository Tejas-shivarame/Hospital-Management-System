"use client";

import Link from "next/link";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Signature panel — a slow, continuous pulse line: the one thing this
          product watches over, rendered as the room's ambient signature. */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="font-display text-2xl italic text-primary-foreground">
          Meridian HMS
        </Link>

        <div className="relative z-10 max-w-sm">
          <p className="font-display text-3xl italic leading-snug text-primary-foreground">
            Every patient, every ward, one steady record.
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70">
            Meridian keeps registration, scheduling, and care records in sync
            across every branch — so your staff sees the same truth, everywhere.
          </p>
        </div>

        <svg
          className="pointer-events-none absolute inset-x-0 bottom-24 h-32 w-full opacity-70"
          viewBox="0 0 800 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 60 H240 L270 20 L300 100 L330 60 H520 L545 35 L565 85 L585 60 H800"
            fill="none"
            stroke="#E8873A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            style={{ strokeDasharray: 100, strokeDashoffset: 100, animation: "draw 3.2s ease-in-out infinite" }}
          />
        </svg>
        <style>{`
          @keyframes draw {
            0% { stroke-dashoffset: 100; }
            45% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -100; }
          }
        `}</style>

        <p className="relative z-10 text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Meridian Health Systems
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
