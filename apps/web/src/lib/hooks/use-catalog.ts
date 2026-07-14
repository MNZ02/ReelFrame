"use client";

import { useQuery } from "@tanstack/react-query";
import type { MotionPreset, VideoModel } from "@repo/shared";
import { api } from "@/lib/api";

export function usePresets() {
  return useQuery<MotionPreset[]>({
    queryKey: ["presets"],
    queryFn: () => api.get<MotionPreset[]>("/presets"),
    staleTime: Infinity,
  });
}

export function useModels() {
  return useQuery<VideoModel[]>({
    queryKey: ["models"],
    queryFn: () => api.get<VideoModel[]>("/models"),
    staleTime: Infinity,
  });
}
