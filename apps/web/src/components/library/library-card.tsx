"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Globe, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { GenerationResponse } from "@repo/shared";
import { StatusBadge } from "@/components/generation/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDeleteGeneration, useTogglePublic } from "@/lib/hooks/use-generations";

export function LibraryCard({ generation }: { generation: GenerationResponse }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteGeneration = useDeleteGeneration();
  const togglePublic = useTogglePublic();

  async function handleDelete() {
    try {
      await deleteGeneration.mutateAsync(generation.id);
      toast.success("Generation deleted");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function handleToggle() {
    try {
      await togglePublic.mutateAsync({ id: generation.id, isPublic: !generation.isPublic });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Link
        href={`/generations/${generation.id}`}
        className="relative aspect-video w-full overflow-hidden bg-muted"
        onMouseEnter={() => videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        }}
      >
        {generation.videoUrl ? (
          <video
            ref={videoRef}
            src={generation.videoUrl}
            poster={generation.thumbnailUrl ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
            {generation.status === "failed" ? "Generation failed" : "Rendering…"}
          </div>
        )}
        <StatusBadge status={generation.status} className="absolute top-2 right-2" />
      </Link>

      <div className="flex flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm">{generation.prompt}</p>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleToggle} disabled={togglePublic.isPending} className="gap-1.5 px-2">
            {generation.isPublic ? (
              <>
                <Globe className="size-3.5" /> Public
              </>
            ) : (
              <>
                <Lock className="size-3.5" /> Private
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this generation?</DialogTitle>
            <DialogDescription>
              This permanently removes the video and its files. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteGeneration.isPending}>
              {deleteGeneration.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
