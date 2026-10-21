CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"pathname" text DEFAULT '' NOT NULL,
	"filename" text DEFAULT '' NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"alt" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"legacy_url" text,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_terms" (
	"post_id" integer NOT NULL,
	"term_id" integer NOT NULL,
	CONSTRAINT "post_terms_post_id_term_id_pk" PRIMARY KEY("post_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'post' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"slug" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"author_id" integer,
	"featured_image_id" integer,
	"sticky" boolean DEFAULT false NOT NULL,
	"template" text DEFAULT 'default' NOT NULL,
	"parent_id" integer,
	"menu_order" integer DEFAULT 0 NOT NULL,
	"primary_category_id" integer,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_score" integer,
	"readability_score" integer,
	"word_count" integer DEFAULT 0 NOT NULL,
	"previous_status" text,
	"wp_id" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp with time zone,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_source_unique" UNIQUE("source")
);
--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"author_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"taxonomy" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"parent_id" integer,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"wp_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'administrator' NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"session_version" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_terms" ADD CONSTRAINT "post_terms_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_terms" ADD CONSTRAINT "post_terms_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_legacy_url_idx" ON "media" USING btree ("legacy_url");--> statement-breakpoint
CREATE INDEX "media_url_idx" ON "media" USING btree ("url");--> statement-breakpoint
CREATE INDEX "post_terms_term_idx" ON "post_terms" USING btree ("term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_listing_idx" ON "posts" USING btree ("type","status","published_at");--> statement-breakpoint
CREATE INDEX "posts_wp_id_idx" ON "posts" USING btree ("wp_id");--> statement-breakpoint
CREATE INDEX "revisions_post_idx" ON "revisions" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_taxonomy_slug_idx" ON "terms" USING btree ("taxonomy","slug");