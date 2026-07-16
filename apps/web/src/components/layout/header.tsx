"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Coins, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMe } from "@/lib/hooks/use-me";
import { signOut } from "@/lib/auth-client";

const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/create", label: "Create" },
  { href: "/library", label: "Library" },
  { href: "/characters", label: "Characters" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, sessionPending, session, me } = useMe();

  async function handleLogout() {
    await signOut();
    queryClient.clear();
    toast.success("Logged out");
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Clapperboard className="size-5 text-primary" />
          <span>Reelframe</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary",
                pathname === link.href && "bg-secondary text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {!sessionPending && isAuthenticated && (
            <>
              <Link href="/credits">
                <Badge variant="secondary" className="h-8 cursor-pointer gap-1.5 px-3 text-sm">
                  <Coins className="size-3.5 text-primary" />
                  {me?.credits ?? "…"}
                </Badge>
              </Link>
              <span className="hidden text-sm text-muted-foreground md:inline">
                {session?.user.name}
              </span>
              <Link href="/profile">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Profile"
                  className={cn(pathname === "/profile" && "bg-secondary text-foreground")}
                >
                  <User className="size-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
                <LogOut className="size-4" />
              </Button>
            </>
          )}

          {!sessionPending && !isAuthenticated && (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
