"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { authClient, useSession } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get("redirect") ?? "/create";

  // Already signed in (e.g. landed here after a broken middleware cookie
  // check, or revisited /login) — send them where they wanted to go.
  useEffect(() => {
    if (!sessionPending && session?.user) {
      router.replace(redirectTo);
    }
  }, [sessionPending, session, redirectTo, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message ?? "Could not log in");
      return;
    }
    // Confirm the session cookie landed (same-origin proxy) before leaving
    // /login — otherwise RequireAuth on /create bounces us straight back.
    const { data: nextSession } = await authClient.getSession();
    setLoading(false);
    if (!nextSession?.user) {
      toast.error("Signed in, but the session cookie was not stored. Please try again.");
      return;
    }
    await queryClient.invalidateQueries();
    toast.success("Welcome back");
    router.push(redirectTo);
    router.refresh();
  }

  if (sessionPending || session?.user) {
    return (
      <p className="text-sm text-muted-foreground">
        {session?.user ? "Redirecting…" : "Checking session…"}
      </p>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Welcome back. Use your email and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Logging in…" : "Log in"}
          </Button>
          <Button type="button" variant="outline" disabled title="Google sign-in requires OAuth keys">
            Continue with Google
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
