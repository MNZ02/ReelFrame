"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMe } from "@/lib/hooks/use-me";

/**
 * Client-side gate for pages that need a session.
 *
 * Next.js middleware cannot see the better-auth cookie: the web app (Vercel)
 * and API (separate host) are different origins, so the session cookie is set
 * on the API domain only. Auth is therefore checked here via useSession(),
 * which calls the API with credentials: "include".
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
