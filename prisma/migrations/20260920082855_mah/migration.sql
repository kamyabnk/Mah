/*
  Warnings:

  - You are about to drop the column `searchVector` on the `Product` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Product_searchVector_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "searchVector";
