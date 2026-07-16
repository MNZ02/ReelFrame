import { createAuthClient } from "better-auth/react";

/**
 * Auth client talks to `/api/auth` on the **web** origin. Next.js rewrites
 * proxy those requests to the real API so session cookies are first-party.
 * Do not point baseURL at NEXT_PUBLIC_API_URL — that reintroduces cross-site
 * cookies and breaks login in production browsers.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession, signIn, signUp, signOut } = authClient;
