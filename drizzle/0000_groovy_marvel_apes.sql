CREATE SEQUENCE "public"."incident_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "acknowledgements" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"cycle" integer NOT NULL,
	"type" text NOT NULL,
	"role" text NOT NULL,
	"acked_by" text,
	"acked_at" timestamp with time zone,
	"comment" text,
	"to_confirm" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_clocks" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"met_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "events" (
	"time" timestamp with time zone NOT NULL,
	"incident_id" text NOT NULL,
	"cycle" integer NOT NULL,
	"actor_id" text NOT NULL,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "follow_up_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"title" text NOT NULL,
	"owner_role" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'NOT_STARTED' NOT NULL,
	"completed_at" timestamp with time zone,
	"kind" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle" integer DEFAULT 1 NOT NULL,
	"status" text NOT NULL,
	"current_owner_roles" text[] DEFAULT '{}' NOT NULL,
	"submitted_by" text NOT NULL,
	"supervisor_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"transcript" text,
	"ai" jsonb,
	"footage_hold_requested" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"site" text DEFAULT 'Main Site' NOT NULL,
	"types" text[] DEFAULT '{}' NOT NULL,
	"severity" text DEFAULT 'Unsure' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervisor_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"incident_id" text NOT NULL,
	"cycle" integer NOT NULL,
	"reviewer_id" text NOT NULL,
	"confirmed_types" text[] DEFAULT '{}' NOT NULL,
	"severity" text NOT NULL,
	"serious_behavioural" boolean DEFAULT false NOT NULL,
	"health_care_beyond_first_aid" boolean DEFAULT false NOT NULL,
	"lost_time" boolean DEFAULT false NOT NULL,
	"critical_injury" boolean DEFAULT false NOT NULL,
	"corrective_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"footage_hold" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "supervisor_reviews_incident_cycle_unique" UNIQUE("incident_id","cycle")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"site" text
);
--> statement-breakpoint
ALTER TABLE "acknowledgements" ADD CONSTRAINT "acknowledgements_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_clocks" ADD CONSTRAINT "compliance_clocks_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_actions" ADD CONSTRAINT "follow_up_actions_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_reviews" ADD CONSTRAINT "supervisor_reviews_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acknowledgements_incident_cycle_idx" ON "acknowledgements" USING btree ("incident_id","cycle");--> statement-breakpoint
CREATE INDEX "acknowledgements_role_idx" ON "acknowledgements" USING btree ("role");--> statement-breakpoint
CREATE INDEX "compliance_clocks_incident_idx" ON "compliance_clocks" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "events_incident_time_idx" ON "events" USING btree ("incident_id","time");--> statement-breakpoint
CREATE INDEX "events_time_idx" ON "events" USING btree ("time");--> statement-breakpoint
CREATE INDEX "follow_up_actions_incident_idx" ON "follow_up_actions" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "incidents_status_idx" ON "incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "incidents_supervisor_idx" ON "incidents" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX "incidents_submitted_by_idx" ON "incidents" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "incidents_site_idx" ON "incidents" USING btree ("site");--> statement-breakpoint
CREATE INDEX "incidents_created_at_idx" ON "incidents" USING btree ("created_at");