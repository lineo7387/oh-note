"use client";

import { ToastProvider } from "@/components/ui/toast";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
