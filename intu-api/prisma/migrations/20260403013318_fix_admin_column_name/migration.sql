/*
  Warnings:

  - You are about to drop the column `realName` on the `admins` table. All the data in the column will be lost.
  - Added the required column `real_name` to the `admins` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `admins` DROP COLUMN `realName`,
    ADD COLUMN `real_name` VARCHAR(50) NOT NULL;
