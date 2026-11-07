import {
  boolean,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import type {
  AiAnalysis,
  Answers,
  ClockKind,
  EventKind,
  IncidentType,
  Role,
  Status,
} from '@/lib/types';

export const incidentIdSeq = pgSequence('incident_id_seq', {
  startWith: 1,
  increment: 1,
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').$type<Role>().notNull(),
  site: text('site'),
});

export const incidents = pgTable(
  'incidents',
  {
    id: text('id').primaryKey(),
    cycle: integer('cycle').notNull().default(1),
    status: text('status').$type<Status>().notNull(),
    currentOwnerRoles: text('current_owner_roles')
      .array()
      .$type<Role[]>()
      .notNull()
      .default([]),
    submittedBy: text('submitted_by').notNull(),
    supervisorId: text('supervisor_id').notNull(),
    answers: jsonb('answers').$type<Answers>().notNull(),
    transcript: text('transcript'),
    ai: jsonb('ai').$type<AiAnalysis>(),
    footageHoldRequested: boolean('footage_hold_requested').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
    // Denormalised columns for fast queries
    site: text('site').notNull().default('Main Site'),
    types: text('types').array().$type<IncidentType[]>().notNull().default([]),
    severity: text('severity').notNull().default('Unsure'),
  },
  (table) => [
    index('incidents_status_idx').on(table.status),
    index('incidents_supervisor_idx').on(table.supervisorId),
    index('incidents_submitted_by_idx').on(table.submittedBy),
    index('incidents_site_idx').on(table.site),
    index('incidents_created_at_idx').on(table.createdAt),
  ],
);

export const supervisorReviews = pgTable(
  'supervisor_reviews',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incidents.id, { onDelete: 'cascade' }),
    cycle: integer('cycle').notNull(),
    reviewerId: text('reviewer_id').notNull(),
    confirmedTypes: text('confirmed_types')
      .array()
      .$type<IncidentType[]>()
      .notNull()
      .default([]),
    severity: text('severity')
      .$type<'Critical' | 'Less Serious' | 'Unsure'>()
      .notNull(),
    seriousBehavioural: boolean('serious_behavioural').notNull().default(false),
    healthCareBeyondFirstAid: boolean('health_care_beyond_first_aid')
      .notNull()
      .default(false),
    lostTime: boolean('lost_time').notNull().default(false),
    criticalInjury: boolean('critical_injury').notNull().default(false),
    correctiveActions: jsonb('corrective_actions')
      .$type<{ title: string; ownerRole: Role; dueAt: string }[]>()
      .notNull()
      .default([]),
    footageHold: boolean('footage_hold').notNull().default(false),
    notes: text('notes').notNull().default(''),
    submittedAt: timestamp('submitted_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    unique('supervisor_reviews_incident_cycle_unique').on(
      table.incidentId,
      table.cycle,
    ),
  ],
);

export const acknowledgements = pgTable(
  'acknowledgements',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incidents.id, { onDelete: 'cascade' }),
    cycle: integer('cycle').notNull(),
    type: text('type').$type<IncidentType>().notNull(),
    role: text('role').$type<Role>().notNull(),
    ackedBy: text('acked_by'),
    ackedAt: timestamp('acked_at', { withTimezone: true, mode: 'string' }),
    comment: text('comment'),
    toConfirm: boolean('to_confirm').notNull().default(false),
  },
  (table) => [
    index('acknowledgements_incident_cycle_idx').on(table.incidentId, table.cycle),
    index('acknowledgements_role_idx').on(table.role),
  ],
);

export const followUpActions = pgTable(
  'follow_up_actions',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incidents.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    ownerRole: text('owner_role').$type<Role>().notNull(),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'string' }).notNull(),
    status: text('status')
      .$type<'NOT_STARTED' | 'IN_PROGRESS' | 'DONE'>()
      .notNull()
      .default('NOT_STARTED'),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
    kind: text('kind')
      .$type<'CORRECTIVE' | 'FOOTAGE_HOLD' | 'REOPEN_NOTE'>()
      .notNull(),
  },
  (table) => [index('follow_up_actions_incident_idx').on(table.incidentId)],
);

export const complianceClocks = pgTable(
  'compliance_clocks',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incidents.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<ClockKind>().notNull(),
    startedAt: timestamp('started_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'string' }).notNull(),
    metAt: timestamp('met_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [index('compliance_clocks_incident_idx').on(table.incidentId)],
);

export const events = pgTable(
  'events',
  {
    time: timestamp('time', { withTimezone: true, mode: 'string' }).notNull(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incidents.id, { onDelete: 'cascade' }),
    cycle: integer('cycle').notNull(),
    actorId: text('actor_id').notNull(),
    kind: text('kind').$type<EventKind>().notNull(),
    fromStatus: text('from_status').$type<Status>(),
    toStatus: text('to_status').$type<Status>(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
  },
  (table) => [
    index('events_incident_time_idx').on(table.incidentId, table.time),
    index('events_time_idx').on(table.time),
  ],
);

