-- AlterTable
ALTER TABLE "AIThread" ADD COLUMN     "analysisResult" TEXT,
ADD COLUMN     "isAnalyzed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "AIThread_isAnalyzed_idx" ON "AIThread"("isAnalyzed");

-- CreateIndex
CREATE INDEX "RequestLog_timestamp_idx" ON "RequestLog"("timestamp");

-- CreateIndex
CREATE INDEX "RequestLog_path_method_idx" ON "RequestLog"("path", "method");

-- CreateIndex
CREATE INDEX "RequestLog_timestamp_path_method_idx" ON "RequestLog"("timestamp", "path", "method");
