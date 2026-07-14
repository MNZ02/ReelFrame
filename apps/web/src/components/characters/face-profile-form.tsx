"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { MediaAssetResponse } from "@repo/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUploadImage } from "@/lib/hooks/use-upload";
import { useCreateFaceProfile } from "@/lib/hooks/use-face-profiles";

export function FaceProfileForm() {
  const [name, setName] = useState("");
  const [images, setImages] = useState<MediaAssetResponse[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const createProfile = useCreateFaceProfile();

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 10 - images.length)) {
      try {
        const asset = await upload.mutateAsync({ file, kind: "face_source" });
        setImages((prev) => [...prev, asset]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || images.length === 0) {
      toast.error("Add a name and at least one photo");
      return;
    }
    try {
      await createProfile.mutateAsync({ name: name.trim(), imageIds: images.map((i) => i.id) });
      toast.success("Face profile created — processing lands in a future release");
      setName("");
      setImages([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create profile");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New character</CardTitle>
        <CardDescription>Upload a few clear photos of a face to create a character profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Photos ({images.length}/10)</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative size-20 overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((i) => i.id !== img.id))}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {images.length < 10 && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary/60"
                >
                  {upload.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                </button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
          </div>

          <Button type="submit" disabled={createProfile.isPending} className="mt-2">
            {createProfile.isPending ? "Creating…" : "Create character"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
