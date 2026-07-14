"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListGenerationsResponse } from "@repo/shared";
import { api } from "@/lib/api";

/** Public feed — no session required, works for anonymous visitors. */
export function useExplore() {
  return useQuery<ListGenerationsResponse>({
    queryKey: ["explore"],
    queryFn: () => api.get<ListGenerationsResponse>("/explore"),
  });
}
