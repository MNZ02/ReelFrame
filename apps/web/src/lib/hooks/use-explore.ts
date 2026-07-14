"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListGenerationsResponse } from "@repo/shared";
import { api } from "@/lib/api";

export function useExplore(enabled: boolean) {
  return useQuery<ListGenerationsResponse>({
    queryKey: ["explore"],
    queryFn: () => api.get<ListGenerationsResponse>("/explore"),
    enabled,
  });
}
