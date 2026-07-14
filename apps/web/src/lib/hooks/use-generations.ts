"use client";

import { useMutation, useQuery, useQueryClient, type Query } from "@tanstack/react-query";
import type {
  CreateGenerationRequest,
  GenerationResponse,
  GenerationStatus,
  ListGenerationsResponse,
} from "@repo/shared";
import { api } from "@/lib/api";

const TERMINAL: ReadonlySet<GenerationStatus> = new Set(["succeeded", "failed", "canceled"]);

function anyNonTerminal(items: GenerationResponse[] | undefined): boolean {
  return (items ?? []).some((g) => !TERMINAL.has(g.status));
}

export function useGenerations(status?: GenerationStatus) {
  return useQuery<ListGenerationsResponse>({
    queryKey: ["generations", status ?? "all"],
    queryFn: () => api.get<ListGenerationsResponse>(`/generations${status ? `?status=${status}` : ""}`),
    refetchInterval: (query: Query<ListGenerationsResponse>) =>
      anyNonTerminal(query.state.data?.items) ? 3000 : false,
  });
}

export function useGeneration(id: string | undefined) {
  return useQuery<GenerationResponse>({
    queryKey: ["generation", id],
    queryFn: () => api.get<GenerationResponse>(`/generations/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query: Query<GenerationResponse>) => {
      const data = query.state.data;
      return data && !TERMINAL.has(data.status) ? 3000 : false;
    },
  });
}

export function useCreateGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGenerationRequest) => api.post<GenerationResponse>("/generations", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["generations"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useDeleteGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/generations/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
  });
}

export function useTogglePublic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      api.patch<GenerationResponse>(`/generations/${id}`, { isPublic }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["generations"] });
      void queryClient.invalidateQueries({ queryKey: ["generation", vars.id] });
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
    },
  });
}

export function useCancelGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<GenerationResponse>(`/generations/${id}/cancel`),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ["generations"] });
      void queryClient.invalidateQueries({ queryKey: ["generation", id] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
