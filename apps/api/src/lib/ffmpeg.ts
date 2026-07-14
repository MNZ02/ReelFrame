import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";

/**
 * Extracts the first frame of `inputPath` into `outputPath` as a JPEG.
 * Best-effort: returns false (never throws) if ffmpeg-static is missing or
 * the process fails, so a broken ffmpeg install just means "no thumbnail"
 * rather than a failed generation.
 */
export async function extractThumbnail(inputPath: string, outputPath: string): Promise<boolean> {
  const binary: string | null = ffmpegPath;
  if (!binary) {
    console.warn("[ffmpeg] ffmpeg-static binary not found; skipping thumbnail");
    return false;
  }
  return new Promise((resolve) => {
    try {
      const proc = spawn(binary, [
        "-y",
        "-i",
        inputPath,
        "-vframes",
        "1",
        "-q:v",
        "3",
        outputPath,
      ]);
      proc.on("error", (err: Error) => {
        console.warn("[ffmpeg] failed to spawn:", err);
        resolve(false);
      });
      proc.on("exit", (code: number | null) => resolve(code === 0));
    } catch (err) {
      console.warn("[ffmpeg] unexpected error:", err);
      resolve(false);
    }
  });
}
