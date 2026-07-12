-- CreateTable
CREATE TABLE "ArticleEngagement" (
    "articleId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "qualifiedReads" INTEGER NOT NULL DEFAULT 0,
    "totalReadSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastImpressionAt" TIMESTAMP(3),
    "lastInteractionAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleEngagement_pkey" PRIMARY KEY ("articleId")
);

-- CreateIndex
CREATE INDEX "ArticleEngagement_lastImpressionAt_idx" ON "ArticleEngagement"("lastImpressionAt");

-- CreateIndex
CREATE INDEX "ArticleEngagement_lastInteractionAt_idx" ON "ArticleEngagement"("lastInteractionAt");

-- AddForeignKey
ALTER TABLE "ArticleEngagement"
ADD CONSTRAINT "ArticleEngagement_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
