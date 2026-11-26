CREATE TYPE "public"."garment_category" AS ENUM('women', 'men', 'kids', 'unisex');--> statement-breakpoint
CREATE TYPE "public"."garment_profile_source" AS ENUM('ai', 'manual');--> statement-breakpoint
CREATE TYPE "public"."garment_profile_status" AS ENUM('auto_detected', 'confirmed', 'corrected');--> statement-breakpoint
CREATE TABLE "garment_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"job_id" uuid,
	"taxonomy_node_id" uuid,
	"fingerprint" text NOT NULL,
	"source" "garment_profile_source" DEFAULT 'ai' NOT NULL,
	"status" "garment_profile_status" DEFAULT 'auto_detected' NOT NULL,
	"detection" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confirmed_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"corrected_by" uuid,
	"taxonomy_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garment_taxonomy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"category" "garment_category" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"description" text,
	"compatibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garment_taxonomy_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "garment_profiles" ADD CONSTRAINT "garment_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_profiles" ADD CONSTRAINT "garment_profiles_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_profiles" ADD CONSTRAINT "garment_profiles_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_profiles" ADD CONSTRAINT "garment_profiles_taxonomy_node_id_garment_taxonomy_id_fk" FOREIGN KEY ("taxonomy_node_id") REFERENCES "public"."garment_taxonomy"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_profiles" ADD CONSTRAINT "garment_profiles_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garment_taxonomy" ADD CONSTRAINT "garment_taxonomy_parent_id_garment_taxonomy_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."garment_taxonomy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "garment_profiles_owner_fingerprint_idx" ON "garment_profiles" USING btree ("owner_id","fingerprint");--> statement-breakpoint
CREATE INDEX "garment_profiles_asset_idx" ON "garment_profiles" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "garment_profiles_taxonomy_idx" ON "garment_profiles" USING btree ("taxonomy_node_id");--> statement-breakpoint
CREATE INDEX "garment_taxonomy_parent_idx" ON "garment_taxonomy" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "garment_taxonomy_category_idx" ON "garment_taxonomy" USING btree ("category");