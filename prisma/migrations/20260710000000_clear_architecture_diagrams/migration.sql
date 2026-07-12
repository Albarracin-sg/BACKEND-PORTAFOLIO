-- ClearDiagramReset
-- Remove all existing architecture diagrams so regeneration starts clean.
-- This is a safe data-only migration: it does NOT touch projects, articles,
-- or any other table. Projects remain; diagrams will be regenerated from
-- repository evidence on the next sync.
-- This migration precedes the migration that creates ArchitectureDiagram on a
-- fresh database. Existing environments may already have the table, while a
-- clean database does not yet. Delete only when it exists.
DO $$
BEGIN
  IF to_regclass('public."ArchitectureDiagram"') IS NOT NULL THEN
    DELETE FROM "ArchitectureDiagram";
  END IF;
END $$;
