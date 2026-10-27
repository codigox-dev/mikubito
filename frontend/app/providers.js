"use client";

import { AuthProvider } from "@/components/auth-provider";
import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
