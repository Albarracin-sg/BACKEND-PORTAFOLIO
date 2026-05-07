/*
  Warnings:

  - Changed the type of `description` on the `Project` table.
  - Changed the type of `problem` on the `Project` table.
  - Changed the type of `challenge` on the `Project` table.
  - Changed the type of `solution` on the `Project` table.

*/
-- AlterTable
ALTER TABLE "Project" 
  ALTER COLUMN "description" TYPE JSONB USING jsonb_build_object('es', "description", 'en', ''),
  ALTER COLUMN "problem" TYPE JSONB USING jsonb_build_object('es', "problem", 'en', ''),
  ALTER COLUMN "challenge" TYPE JSONB USING jsonb_build_object('es', "challenge", 'en', ''),
  ALTER COLUMN "solution" TYPE JSONB USING jsonb_build_object('es', "solution", 'en', '');
