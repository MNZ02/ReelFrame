import { and, eq } from "drizzle-orm";
import { schema } from "@repo/db";
import { ApiError } from "@repo/shared";
import { db } from "../db";

type GenerationRow = typeof schema.generations.$inferSelect;

/**
 * Cancels a generation while it's still `queued`, refunding its cost.
 * Not-found and wrong-state are both surfaced as ApiError so callers (the
 * HTTP route, tests) get the same behavior either way.
 */
export async function cancelGeneration(userId: string, generationId: string): Promise<GenerationRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.generations)
      .where(and(eq(schema.generations.id, generationId), eq(schema.generations.userId, userId)))
      .for("update");

    if (!row || row.deletedAt) {
      throw new ApiError("NOT_FOUND", "Generation not found", 404);
    }
    if (row.status !== "queued") {
      throw new ApiError("INVALID_STATE", "Only queued generations can be canceled", 409);
    }

    const [canceled] = await tx
      .update(schema.generations)
      .set({ status: "canceled", completedAt: new Date() })
      .where(eq(schema.generations.id, generationId))
      .returning();

    await tx.insert(schema.creditLedger).values({
      userId,
      delta: row.creditsCost,
      reason: "refund",
      generationId,
    });

    return canceled!;
  });
}
