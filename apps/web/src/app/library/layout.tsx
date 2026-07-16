import { RequireAuth } from "@/components/auth/require-auth";

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
