CREATE TYPE "public"."wear_style_kind" AS ENUM('saree_drape', 'dupatta_placement', 'regional_look', 'layering');--> statement-breakpoint
CREATE TABLE "wear_styles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "wear_style_kind" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"region" text,
	"taxonomy_slugs" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"compatibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prompt_fragment" text NOT NULL,
	"drape_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wear_styles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "wear_styles" ADD CONSTRAINT "wear_styles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wear_styles_kind_idx" ON "wear_styles" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "wear_styles_active_idx" ON "wear_styles" USING btree ("is_active");