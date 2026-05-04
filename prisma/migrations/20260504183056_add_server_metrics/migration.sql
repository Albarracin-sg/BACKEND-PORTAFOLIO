-- CreateTable
CREATE TABLE "ServerMetric" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerMetric_pkey" PRIMARY KEY ("key")
);
