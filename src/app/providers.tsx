"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LogRocketProvider } from "@/components/LogRocketProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LogRocketProvider>
        <ToastProvider>{children}</ToastProvider>
      </LogRocketProvider>
    </SessionProvider>
  );
}
