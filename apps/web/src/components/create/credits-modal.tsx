"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CreditsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/15">
            <Coins className="size-5 text-primary" />
          </div>
          <DialogTitle>Not enough credits</DialogTitle>
          <DialogDescription>
            This generation costs more credits than you have left. Top up your balance to keep
            creating.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Link href="/credits" className="w-full sm:w-auto">
            <Button className="w-full">View credits</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
