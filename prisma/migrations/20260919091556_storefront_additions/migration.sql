-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "averageRating" DECIMAL(2,1),
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "Product_status_price_idx" ON "Product"("status", "price");

-- CreateIndex
CREATE INDEX "Product_status_publishedAt_idx" ON "Product"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_status_averageRating_idx" ON "Product"("status", "averageRating");

-- CreateIndex
CREATE INDEX "Product_fragranceFamilyId_idx" ON "Product"("fragranceFamilyId");

-- Full-text search (generated column + GIN index)
ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce("nameEn", '') || ' ' ||
      coalesce("nameFa", '') || ' ' ||
      coalesce("sku", '') || ' ' ||
      coalesce("fragranceNotesEn", '') || ' ' ||
      coalesce("fragranceNotesFa", '') || ' ' ||
      coalesce("descriptionEn", '') || ' ' ||
      coalesce("descriptionFa", '')
    )
  ) STORED;

CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
