import { RequireAuth } from "@/components/auth/require-auth";

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
