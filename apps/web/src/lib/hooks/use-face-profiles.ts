"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateFaceProfileRequest, FaceProfileResponse } from "@repo/shared";
import { api } from "@/lib/api";

export function useFaceProfiles() {
  return useQuery<FaceProfileResponse[]>({
    queryKey: ["face-profiles"],
    queryFn: () => api.get<FaceProfileResponse[]>("/face-profiles"),
  });
}

export function useCreateFaceProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFaceProfileRequest) =>
      api.post<FaceProfileResponse>("/face-profiles", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["face-profiles"] });
    },
  });
}
