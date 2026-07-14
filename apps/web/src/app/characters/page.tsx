"use client";

import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FaceProfileForm } from "@/components/characters/face-profile-form";
import { useFaceProfiles } from "@/lib/hooks/use-face-profiles";

const STATUS_VARIANT = {
  pending: "secondary",
  ready: "success",
  failed: "destructive",
} as const;

export default function CharactersPage() {
  const { data: profiles = [], isLoading } = useFaceProfiles();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Characters</h1>
        <p className="text-sm text-muted-foreground">
          Face swap isn&apos;t live yet — create a character profile now and swap actions unlock in
          a future release.
        </p>
      </div>

      <FaceProfileForm />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Your characters
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No characters yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="size-4" />
                    {profile.name}
                  </CardTitle>
                  <Badge variant={STATUS_VARIANT[profile.status]}>{profile.status}</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex gap-1.5 overflow-x-auto">
                    {profile.images.slice(0, 4).map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img.id}
                        src={img.url}
                        alt=""
                        className="size-12 shrink-0 rounded-md object-cover"
                      />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" disabled title="Face swap ships in a future release">
                    Use for swap · Coming soon
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
