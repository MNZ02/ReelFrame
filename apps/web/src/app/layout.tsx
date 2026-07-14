import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Reelframe — AI camera-motion video generation",
  description:
    "Write a prompt, pick a cinematic camera move, and generate a short AI video.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
