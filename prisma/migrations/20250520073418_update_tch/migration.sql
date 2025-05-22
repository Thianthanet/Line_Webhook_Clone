-- DropIndex
DROP INDEX "TechnicianJob_jobId_key";

-- AlterTable
ALTER TABLE "TechnicianJob" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "signature" TEXT;
