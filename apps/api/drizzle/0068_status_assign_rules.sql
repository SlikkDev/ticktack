CREATE TABLE "status_assign_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"status" text NOT NULL,
	"assignee_id" text NOT NULL,
	"created_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL,
	"updated_at" timestamp DEFAULT (now() AT TIME ZONE 'utc') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "status_assign_rule" ADD CONSTRAINT "status_assign_rule_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status_assign_rule" ADD CONSTRAINT "status_assign_rule_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status_assign_rule" ADD CONSTRAINT "status_assign_rule_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "status_assign_rule_workspace_status_uidx" ON "status_assign_rule" USING btree ("workspace_id","status") WHERE "status_assign_rule"."project_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "status_assign_rule_project_status_uidx" ON "status_assign_rule" USING btree ("project_id","status") WHERE "status_assign_rule"."project_id" is not null;--> statement-breakpoint
CREATE INDEX "status_assign_rule_assigneeId_idx" ON "status_assign_rule" USING btree ("assignee_id");