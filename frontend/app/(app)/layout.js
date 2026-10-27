"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui";

export default function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoadingScreen label="Volviendo al inicio de sesión..." />;
  }

  return <AppShell>{children}</AppShell>;
}
