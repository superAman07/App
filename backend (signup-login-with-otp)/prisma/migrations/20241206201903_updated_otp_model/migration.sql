/*
  Warnings:

  - You are about to drop the column `otp` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Otp_mobileNumber_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "otp";
