-- CreateEnum
CREATE TYPE "HouseholdMember" AS ENUM ('ALEX', 'SANDRA');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "assigneeKey" "HouseholdMember";

-- Backfill: identifica a los dos miembros que ya existían por su nombre.
-- El seed vuelve a fijarlo y sirve para futuras instalaciones.
UPDATE "User" SET "assigneeKey" = 'ALEX' WHERE "assigneeKey" IS NULL AND lower("name") = 'alex';
UPDATE "User" SET "assigneeKey" = 'SANDRA' WHERE "assigneeKey" IS NULL AND lower("name") = 'sandra';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
