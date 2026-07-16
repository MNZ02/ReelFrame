import { RequireAuth } from "@/components/auth/require-auth";

export default function CharactersLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
