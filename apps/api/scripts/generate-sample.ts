/**
 * Regenerates apps/api/assets/sample.mp4 — a tiny (~40KB) SMPTE color-bars
 * clip used by MockProvider as the "generated" video. Only needs to be run
 * if the checked-in asset is lost; the file itself is committed so a fresh
 * clone doesn't need ffmpeg at install time.
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

const OUTPUT_PATH = path.join(import.meta.dir, "..", "assets", "sample.mp4");

function main() {
  if (!ffmpegPath) {
    console.error("ffmpeg-static binary not found");
    process.exit(1);
  }
  const result = spawnSync(ffmpegPath, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "smptebars=size=640x360:rate=24",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=44100",
    "-t",
    "4",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    OUTPUT_PATH,
  ]);
  if (result.status !== 0) {
    console.error("ffmpeg failed", result.stderr?.toString());
    process.exit(1);
  }
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main();
