"use client";

import { CalendarDays, Coins, Mail, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMe } from "@/lib/hooks/use-me";

export default function ProfilePage() {
  const { session, me } = useMe();
  const user = session?.user;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Editing your profile isn&apos;t available yet.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Display name</p>
              <p className="font-medium">{user?.name ?? "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <Mail className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email ?? "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="font-medium">{memberSince}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/15">
            <Coins className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-semibold">{me?.credits ?? "—"}</p>
            <p className="text-sm text-muted-foreground">credits available</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
