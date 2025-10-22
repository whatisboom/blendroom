"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { initializeLogRocket, identifyUser } from "@/lib/logrocket";

/**
 * LogRocket Provider Component
 * Initializes LogRocket and identifies authenticated users
 *
 * This component should be added near the root of your app (in layout.tsx)
 */
export function LogRocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // Initialize LogRocket once on mount
  useEffect(() => {
    initializeLogRocket();
  }, []);

  // Identify user when session is available
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      identifyUser(session.user.id, {
        name: session.user.name,
        email: session.user.email,
        spotifyId: session.user.spotifyId,
      });
    }
  }, [session, status]);

  return <>{children}</>;
}
