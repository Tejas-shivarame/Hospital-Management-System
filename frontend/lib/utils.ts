import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiErrorMessage(error: unknown): string {
  const err = error as {
    response?: { data?: { message?: string; errors?: Record<string, string[]> } };
    message?: string;
  };
  const data = err?.response?.data;
  if (data?.errors) {
    const firstKey = Object.keys(data.errors)[0];
    const firstMsg = data.errors[firstKey];
    if (firstKey && firstMsg) return `${firstKey}: ${Array.isArray(firstMsg) ? firstMsg[0] : firstMsg}`;
  }
  return data?.message || err?.message || "Something went wrong. Please try again.";
}
