"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@/lib/hooks/use-me";

/**
 * Client-side gate for pages that need a session.
 *
 * Session cookies are first-party on the web origin (Next rewrites proxy
 * `/api/*` to the API). Auth is checked here via useSession() rather than
 * middleware so the check runs after the client can read the cookie.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, sessionPending } = useMe();

  useEffect(() => {
    if (sessionPending || isAuthenticated) return;
    const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
    router.replace(loginUrl);
  }, [sessionPending, isAuthenticated, pathname, router]);

  if (sessionPending) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
