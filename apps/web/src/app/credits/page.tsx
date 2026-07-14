"use client";

import { Coins, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/generation/status-badge";
import { useMe } from "@/lib/hooks/use-me";
import { useGenerations } from "@/lib/hooks/use-generations";

const PACKS = [
  { credits: 100, price: "$5" },
  { credits: 500, price: "$20" },
  { credits: 1500, price: "$50" },
];

export default function CreditsPage() {
  const { me } = useMe();
  const { data, isLoading } = useGenerations();
  const items = data?.items ?? [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Credits</h1>
        <p className="text-sm text-muted-foreground">Your balance and recent credit activity.</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/15">
              <Coins className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-semibold">{me?.credits ?? "—"}</p>
              <p className="text-sm text-muted-foreground">credits available</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buy credits</CardTitle>
          <CardDescription>Payments aren&apos;t wired up yet — these buttons are stubs.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PACKS.map((pack) => (
            <div
              key={pack.credits}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4"
            >
              <span className="text-lg font-semibold">{pack.credits} credits</span>
              <span className="text-sm text-muted-foreground">{pack.price}</span>
              <Button variant="outline" disabled className="w-full">
                Buy (coming soon)
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription className="flex items-start gap-1.5">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Derived from your generations (each costs credits on creation; failed or canceled ones
            are automatically refunded). A dedicated ledger endpoint isn&apos;t available yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((g) => {
                  const refunded = g.status === "failed" || g.status === "canceled";
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{g.prompt}</TableCell>
                      <TableCell>
                        <StatusBadge status={g.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={refunded ? "text-muted-foreground line-through" : ""}>
                          -{g.creditsCost}
                        </span>
                        {refunded && <span className="ml-2 text-success">+{g.creditsCost}</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
