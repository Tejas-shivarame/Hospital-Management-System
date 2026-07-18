"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { getApiErrorMessage } from "@/lib/utils";
import type { LoginFormValues, RegisterFormValues } from "@/lib/validations/auth.schema";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSession, logout: clearSession, user, accessToken } = useAuthStore();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await authService.me()).data.data,
    enabled: !!accessToken,
    initialData: user ?? undefined,
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormValues) => authService.login(payload),
    onSuccess: ({ data }) => {
      if (data.data.requires_2fa) {
        toast.info("Enter the verification code to continue.");
        router.push(`/verify-2fa?email=${encodeURIComponent(data.data.email!)}`);
        return;
      }
      setSession(data.data.user!, { access: data.data.access!, refresh: data.data.refresh! });
      toast.success("Welcome back.");
      router.push("/dashboard");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterFormValues) =>
      authService.register({
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        confirm_password: payload.confirm_password,
      }),
    onSuccess: (_, variables) => {
      toast.success("Account created. Check your email for a verification code.");
      router.push(`/verify-otp?email=${encodeURIComponent(variables.email)}&purpose=email_verification`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const logout = async () => {
    const refresh = useAuthStore.getState().refreshToken;
    try {
      if (refresh) await authService.logout(refresh);
    } catch {
      // best-effort — clear local session regardless
    } finally {
      clearSession();
      queryClient.clear();
      router.push("/login");
    }
  };

  return {
    user: meQuery.data,
    isLoadingUser: meQuery.isLoading,
    isAuthenticated: !!accessToken,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout,
  };
}
