-- =============================================================
-- Sanctuary – Seed Data (datos de ejemplo)
-- Run AFTER schema.sql
-- =============================================================

-- ── Areas ───────────────────────────────────────────────────────────
INSERT INTO areas (name) VALUES
  ('Alabanza'),
  ('Danza'),
  ('Multimedia'),
  ('Sonido'),
  ('Niños')
ON CONFLICT (name) DO NOTHING;

-- ── Subareas ────────────────────────────────────────────────────────
-- Alabanza
INSERT INTO subareas (name, area_id)
SELECT r.name, a.id
FROM (VALUES
  ('Director/a de Alabanza'),
  ('Guitarra'),
  ('Piano / Teclado'),
  ('Bajo'),
  ('Batería'),
  ('Voz 1'),
  ('Voz 2'),
  ('Voz 3')
) AS r(name)
CROSS JOIN (SELECT id FROM areas WHERE name = 'Alabanza') a
ON CONFLICT DO NOTHING;

-- Danza
INSERT INTO subareas (name, area_id)
SELECT r.name, a.id
FROM (VALUES
  ('Coreógrafo/a'),
  ('Integrante Danza')
) AS r(name)
CROSS JOIN (SELECT id FROM areas WHERE name = 'Danza') a
ON CONFLICT DO NOTHING;

-- Multimedia
INSERT INTO subareas (name, area_id)
SELECT r.name, a.id
FROM (VALUES
  ('Proyección / Letras'),
  ('Transmisión en Vivo'),
  ('Fotografía')
) AS r(name)
CROSS JOIN (SELECT id FROM areas WHERE name = 'Multimedia') a
ON CONFLICT DO NOTHING;

-- Sonido
INSERT INTO subareas (name, area_id)
SELECT r.name, a.id
FROM (VALUES
  ('Operador de Sonido'),
  ('Monitoreo')
) AS r(name)
CROSS JOIN (SELECT id FROM areas WHERE name = 'Sonido') a
ON CONFLICT DO NOTHING;

-- Niños
INSERT INTO subareas (name, area_id)
SELECT r.name, a.id
FROM (VALUES
  ('Maestro/a Principal'),
  ('Asistente de Niños'),
  ('Recepción de Niños')
) AS r(name)
CROSS JOIN (SELECT id FROM areas WHERE name = 'Niños') a
ON CONFLICT DO NOTHING;

-- ── People (example members) ────────────────────────────────────────
INSERT INTO people (name) VALUES
  ('Ana García'),
  ('Carlos López'),
  ('María Rodríguez'),
  ('José Martínez'),
  ('Laura Sánchez'),
  ('Pedro González'),
  ('Sofía Hernández'),
  ('Diego Torres'),
  ('Valentina Flores'),
  ('Andrés Morales')
ON CONFLICT DO NOTHING;

-- Note: After inserting people and subareas, assign skills via person_subareas
-- through the UI or with a follow-up INSERT.
