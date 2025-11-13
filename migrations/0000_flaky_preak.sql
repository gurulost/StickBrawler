CREATE TABLE "economy_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"user_id" integer,
	"coins" integer DEFAULT 0 NOT NULL,
	"lifetime_coins" integer DEFAULT 0 NOT NULL,
	"unlocks" jsonb NOT NULL,
	"last_coin_event" jsonb DEFAULT 'null'::jsonb,
	"updated_at" text NOT NULL,
	CONSTRAINT "economy_snapshots_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "game_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"score" integer NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"high_score" integer DEFAULT 0,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "economy_snapshots" ADD CONSTRAINT "economy_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;