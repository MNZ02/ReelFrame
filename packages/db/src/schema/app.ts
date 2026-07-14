import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

export const ledgerReasonEnum = pgEnum("ledger_reason", [
  "signup_grant",
  "generation",
  "refund",
  "admin_grant",
]);

export const mediaKindEnum = pgEnum("media_kind", [
  "source_image",
  "video",
  "thumbnail",
  "face_source",
]);

export const generationStatusEnum = pgEnum("generation_status", [
  "queued",
  "processing",
  "succeeded",
  "failed",
  "canceled",
]);

export const generationProviderEnum = pgEnum("generation_provider", [
  "fal",
  "mock",
]);

export const aspectRatioEnum = pgEnum("aspect_ratio", ["16:9", "9:16", "1:1"]);

export const faceProfileStatusEnum = pgEnum("face_profile_status", [
  "pending",
  "ready",
  "failed",
]);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: ledgerReasonEnum("reason").notNull(),
    generationId: uuid("generation_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // At most one signup grant per user — makes the signup-grant hook safe
    // to retry without double-crediting.
    uniqueIndex("credit_ledger_one_signup_grant_per_user")
      .on(table.userId)
      .where(sql`${table.reason} = 'signup_grant'`),
  ],
);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: mediaKindEnum("kind").notNull(),
  bucket: text("bucket").notNull(),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const faceProfiles = pgTable("face_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: faceProfileStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const faceProfileImages = pgTable("face_profile_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  faceProfileId: uuid("face_profile_id")
    .notNull()
    .references(() => faceProfiles.id, { onDelete: "cascade" }),
  mediaAssetId: uuid("media_asset_id")
    .notNull()
    .references(() => mediaAssets.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: generationStatusEnum("status").notNull().default("queued"),
  prompt: text("prompt").notNull(),
  enhancedPrompt: text("enhanced_prompt"),
  motionPreset: text("motion_preset"),
  model: text("model").notNull(),
  provider: generationProviderEnum("provider").notNull(),
  providerJobId: text("provider_job_id"),
  aspectRatio: aspectRatioEnum("aspect_ratio").notNull(),
  durationSecs: integer("duration_secs").notNull(),
  creditsCost: integer("credits_cost").notNull(),
  sourceImageId: uuid("source_image_id").references(() => mediaAssets.id),
  videoAssetId: uuid("video_asset_id").references(() => mediaAssets.id),
  thumbnailId: uuid("thumbnail_id").references(() => mediaAssets.id),
  faceProfileId: uuid("face_profile_id").references(() => faceProfiles.id),
  isPublic: boolean("is_public").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  // Not in the product spec's table listing; added so DELETE can soft-hide
  // (spec: "soft-hide + delete objects") without a dedicated status value.
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
