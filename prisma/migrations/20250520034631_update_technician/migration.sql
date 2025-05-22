/*
  Warnings:

  - A unique constraint covering the columns `[jobId]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "TechnicianJob" (
    "id" SERIAL NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "technicianId" TEXT,
    "description" TEXT,
    "image1" TEXT,
    "image2" TEXT,
    "image3" TEXT,
    "image4" TEXT,
    "location" TEXT,
    "type" TEXT,
    "timestamp" TIMESTAMP(3),
    "detailAction" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianJob_jobId_key" ON "TechnicianJob"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobId_key" ON "Job"("jobId");

-- AddForeignKey
ALTER TABLE "TechnicianJob" ADD CONSTRAINT "TechnicianJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianJob" ADD CONSTRAINT "TechnicianJob_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
