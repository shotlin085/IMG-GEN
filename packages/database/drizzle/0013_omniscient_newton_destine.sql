CREATE TYPE "public"."character_origin_kind" AS ENUM('preset', 'synthetic', 'custom');--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "origin_kind" character_origin_kind DEFAULT 'preset' NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "consent_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "consent_statement_version" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "guardian_confirmed_at" timestamp with time zone;