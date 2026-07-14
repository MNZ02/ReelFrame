import type { ZodType } from "zod";
import { ApiError } from "@repo/shared";

export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new ApiError("VALIDATION_ERROR", message || "Invalid request", 400);
  }
  return result.data;
}
