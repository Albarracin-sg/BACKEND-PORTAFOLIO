-- ClearDiagramReset
-- Remove all existing architecture diagrams so regeneration starts clean.
-- This is a safe data-only migration: it does NOT touch projects, articles,
-- or any other table. Projects remain; diagrams will be regenerated from
-- repository evidence on the next sync.
DELETE FROM "ArchitectureDiagram";
