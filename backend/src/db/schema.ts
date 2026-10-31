import { pgTable, text, timestamp, doublePrecision, uuid, integer, jsonb, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Custom type for PostGIS Geometry
const geometry = (name: string) => text(name).default(sql`ST_GeomFromText('')`); // Placeholder mapping till Postgis properly integrated with Drizzle

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const points = pgTable('points', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    location: geometry('location'), // To be used with ST_MakePoint
    accuracy: doublePrecision('accuracy'),
    altitude: doublePrecision('altitude'),
    speed: doublePrecision('speed'),
    heading: doublePrecision('heading'),
    timestamp: timestamp('timestamp').notNull(),
    activityType: text('activity_type'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trips = pgTable('trips', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    distance: doublePrecision('distance'),
    mode: text('mode'),
    path: geometry('path'), // Postgis LineString
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const healthStepsDaily = pgTable('health_steps_daily', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    date: text('date').notNull(),
    steps: integer('steps').notNull(),
    source: text('source'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
    unique('health_steps_daily_user_date_unique').on(t.userId, t.date),
]);

export const sleepSessions = pgTable('sleep_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    externalId: text('external_id'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    durationMin: integer('duration_min').notNull(),
    stages: jsonb('stages'),
    source: text('source'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
    unique('sleep_sessions_user_ext_unique').on(t.userId, t.externalId),
]);

export const stops = pgTable('stops', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    location: geometry('location'),
    radius: doublePrecision('radius'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
