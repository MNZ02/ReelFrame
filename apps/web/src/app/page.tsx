import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { MOTION_PRESETS } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { presetThumbnailSrc } from "@/lib/presets";

export default function LandingPage() {
  const reel = MOTION_PRESETS.slice(0, 10);

  return (
    <div className="bg-grid">
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 pt-24 pb-16 text-center sm:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          Prompt-to-video, cinematic camera moves
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Turn a sentence into a cinematic shot
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
          Write a prompt, pick a crash zoom, a 360 orbit, or a bullet-time freeze, and generate a
          short AI video in minutes. Free credits to start.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Get started free <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/explore">
            <Button size="lg" variant="outline">
              Browse Explore
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Camera-motion presets
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {reel.map((preset) => (
            <div
              key={preset.slug}
              className="group relative overflow-hidden rounded-xl border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={presetThumbnailSrc(preset.slug)}
                alt={preset.name}
                className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="text-xs font-medium text-white">{preset.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
