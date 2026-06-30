-- AlterTable
ALTER TABLE `venues` ADD COLUMN `is_site_visited` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `site_visit_date` DATE NULL,
    ADD COLUMN `site_visit_note` TEXT NULL;
