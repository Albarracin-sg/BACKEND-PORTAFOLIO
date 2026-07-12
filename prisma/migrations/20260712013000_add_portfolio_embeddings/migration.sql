CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "PortfolioEmbedding" (
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioEmbedding_pkey" PRIMARY KEY ("sourceType", "sourceId")
);

CREATE INDEX "PortfolioEmbedding_embedding_cosine_idx"
    ON "PortfolioEmbedding"
    USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 100);
