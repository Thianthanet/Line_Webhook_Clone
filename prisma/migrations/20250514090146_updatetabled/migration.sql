-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_userId_fkey";

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "technicianId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
