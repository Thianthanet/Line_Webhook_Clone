/*
  Warnings:

  - Added the required column `jobId` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "jobId" TEXT NOT NULL,
ADD COLUMN     "technicianId" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
