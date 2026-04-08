-- =============================================================
-- Sanctuary Church Management – Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── People ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS people (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Areas ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS areas (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Subareas / Roles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subareas (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  area_id    UUID    REFERENCES areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Person → Subareas (skills) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS person_subareas (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id   UUID  REFERENCES people(id) ON DELETE CASCADE,
  subarea_id  UUID  REFERENCES subareas(id) ON DELETE CASCADE,
  UNIQUE(person_id, subarea_id)
);

-- ── Availability Exceptions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id         UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id  UUID  REFERENCES people(id) ON DELETE CASCADE,
  date       DATE  NOT NULL,
  UNIQUE(person_id, date)
);

-- ── Schedules (service events) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
  id           UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  date         DATE  NOT NULL,
  service_name TEXT  NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assignments ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID  REFERENCES schedules(id) ON DELETE CASCADE,
  person_id   UUID  REFERENCES people(id) ON DELETE SET NULL,
  subarea_id  UUID  REFERENCES subareas(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- Row-Level Security (RLS)
-- Only authenticated users can read/write all tables.
-- =============================================================

ALTER TABLE people                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE subareas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_subareas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments             ENABLE ROW LEVEL SECURITY;

-- Helper: allow authenticated users full access
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'people','areas','subareas','person_subareas',
    'availability_exceptions','schedules','assignments'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "auth_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      tbl
    );
  END LOOP;
END $$;

-- =============================================================
-- Indexes for performance
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_subareas_area      ON subareas(area_id);
CREATE INDEX IF NOT EXISTS idx_person_sub_person  ON person_subareas(person_id);
CREATE INDEX IF NOT EXISTS idx_person_sub_sub     ON person_subareas(subarea_id);
CREATE INDEX IF NOT EXISTS idx_avail_person       ON availability_exceptions(person_id);
CREATE INDEX IF NOT EXISTS idx_avail_date         ON availability_exceptions(date);
CREATE INDEX IF NOT EXISTS idx_schedules_date     ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_assign_schedule    ON assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_assign_person      ON assignments(person_id);

-- =============================================================
-- User Roles
-- Tracks admin vs viewer role per Supabase auth user.
-- Only the service-role backend can write this table.
-- Authenticated users can read any row (to support first-user
-- bootstrap logic in the API).
-- =============================================================

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    UUID    PRIMARY KEY,  -- matches auth.users.id
  role       TEXT    NOT NULL DEFAULT 'viewer'
                     CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read (needed for first-user detection)
CREATE POLICY "user_roles_read" ON user_roles
  FOR SELECT TO authenticated USING (true);

-- Only service role (backend) can insert/update/delete
-- (no client-side write policy = only service_role key can write)

-- =============================================================
-- Person Available Days
-- Which days of the week (0=Sun … 6=Sat) each person CAN serve.
-- Empty = no restriction (can serve any day).
-- =============================================================

CREATE TABLE IF NOT EXISTS person_available_days (
  person_id   UUID    REFERENCES people(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  PRIMARY KEY (person_id, day_of_week)
);

ALTER TABLE person_available_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_avail_days" ON person_available_days
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
