/*
  Warnings:

  - A unique constraint covering the columns `[mobileNumber]` on the table `Otp` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Otp_mobileNumber_key" ON "Otp"("mobileNumber");

-- CreateIndex
CREATE INDEX "Otp_mobileNumber_idx" ON "Otp"("mobileNumber");
