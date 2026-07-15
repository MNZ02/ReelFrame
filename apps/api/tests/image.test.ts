import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { normalizeSourceImage } from "../src/lib/image";

async function solid(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer();
}

describe("normalizeSourceImage", () => {
  test("outputs the target dimensions for each aspect ratio", async () => {
    const input = await solid(1000, 1000);

    const wide = await normalizeSourceImage(input, "16:9");
    expect([wide.width, wide.height]).toEqual([1280, 720]);
    const wideMeta = await sharp(wide.buffer).metadata();
    expect([wideMeta.width, wideMeta.height]).toEqual([1280, 720]);
    expect(wideMeta.format).toBe("jpeg");

    const tall = await normalizeSourceImage(input, "9:16");
    expect([tall.width, tall.height]).toEqual([720, 1280]);

    const square = await normalizeSourceImage(input, "1:1");
    expect([square.width, square.height]).toEqual([1024, 1024]);
  });

  test("crops a portrait input to a landscape target (no distortion via cover fit)", async () => {
    const input = await solid(600, 1200); // portrait
    const out = await normalizeSourceImage(input, "16:9");
    const meta = await sharp(out.buffer).metadata();
    expect([meta.width, meta.height]).toEqual([1280, 720]);
  });

  test("bakes in EXIF orientation and strips the tag (the rotated-video fix)", async () => {
    // A 400x800 image tagged orientation:8 (rotate 90° CCW to view upright) —
    // the exact class of phone photo that produced sideways video output.
    const input = await sharp({
      create: { width: 400, height: 800, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .withMetadata({ orientation: 8 })
      .jpeg()
      .toBuffer();
    expect((await sharp(input).metadata()).orientation).toBe(8);

    const out = await normalizeSourceImage(input, "16:9");
    const meta = await sharp(out.buffer).metadata();
    // Orientation applied and removed → downstream models see upright pixels.
    expect(meta.orientation === undefined || meta.orientation === 1).toBe(true);
    expect([meta.width, meta.height]).toEqual([1280, 720]);
  });
});
