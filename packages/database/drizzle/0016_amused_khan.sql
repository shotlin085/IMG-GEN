CREATE TYPE "public"."studio_preset_kind" AS ENUM('generation', 'brand');--> statement-breakpoint
CREATE TABLE "studio_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "studio_preset_kind" DEFAULT 'generation' NOT NULL,
	"name" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "garment_profiles" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "garment_profiles" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "studio_presets" ADD CONSTRAINT "studio_presets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_presets_owner_idx" ON "studio_presets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "studio_presets_kind_idx" ON "studio_presets" USING btree ("kind");