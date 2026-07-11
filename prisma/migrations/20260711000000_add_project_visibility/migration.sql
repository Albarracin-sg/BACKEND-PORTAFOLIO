-- Preserve synchronized and private work records while preventing inactive work from being exposed.
CREATE TYPE "ProjectKind" AS ENUM ('PUBLIC', 'PRIVATE');

ALTER TABLE "Project"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "kind" "ProjectKind" NOT NULL DEFAULT 'PUBLIC',
  ALTER COLUMN "githubUrl" DROP NOT NULL;

CREATE INDEX "Project_isActive_kind_idx" ON "Project"("isActive", "kind");

-- Keep only one public diagram per project, so linked blog posts cannot render duplicates.
WITH ranked_diagrams AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY position ASC, "createdAt" ASC) AS row_number
  FROM "ArchitectureDiagram"
  WHERE published = true
)
UPDATE "ArchitectureDiagram"
SET published = false
WHERE id IN (SELECT id FROM ranked_diagrams WHERE row_number > 1);
