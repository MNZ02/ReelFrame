import { RequireAuth } from "@/components/auth/require-auth";

export default function CreditsLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
