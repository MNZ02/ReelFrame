import { RequireAuth } from "@/components/auth/require-auth";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
