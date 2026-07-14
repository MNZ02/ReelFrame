"use client";

import { useQuery } from "@tanstack/react-query";
import type { MeResponse } from "@repo/shared";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

/** Combines the better-auth client session (who am I) with /me (credit balance). */
export function useMe() {
  const { data: session, isPending: sessionPending } = useSession();
  const meQuery = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/me"),
    enabled: Boolean(session?.user),
  });

  return {
    session,
    sessionPending,
    isAuthenticated: Boolean(session?.user),
    me: meQuery.data,
    ...meQuery,
  };
}
