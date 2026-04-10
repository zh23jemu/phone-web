CREATE DATABASE IF NOT EXISTS `phone` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `likeadmin` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'phone'@'%' IDENTIFIED BY 'phone2025';
GRANT ALL PRIVILEGES ON `phone`.* TO 'phone'@'%';
GRANT ALL PRIVILEGES ON `likeadmin`.* TO 'phone'@'%';
FLUSH PRIVILEGES;

USE `phone`;

CREATE TABLE IF NOT EXISTS `la_call_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `call_id` VARCHAR(64) NOT NULL,
  `dialer_user_id` BIGINT NOT NULL,
  `backend_user_id` BIGINT NOT NULL,
  `dialed_number` VARCHAR(32) NOT NULL,
  `start_time` INT NOT NULL,
  `end_time` INT DEFAULT NULL,
  `duration` INT DEFAULT NULL,
  `status` VARCHAR(32) NOT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `call_type` VARCHAR(32) NOT NULL DEFAULT 'normal',
  `display` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` INT NOT NULL,
  `updated_at` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_call_id` (`call_id`),
  KEY `idx_dialer_user_id` (`dialer_user_id`),
  KEY `idx_backend_user_id` (`backend_user_id`),
  KEY `idx_dialed_number` (`dialed_number`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `la_call_mark` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dialed_number` VARCHAR(32) NOT NULL,
  `mark_type` VARCHAR(64) NOT NULL,
  `marked_by_user_id` BIGINT DEFAULT NULL,
  `created_at` INT NOT NULL,
  `updated_at` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dialed_number` (`dialed_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `la_contacts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL DEFAULT 0,
  `phone` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `created_at` INT NOT NULL DEFAULT 0,
  `updated_at` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `la_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sender_id` VARCHAR(64) NOT NULL,
  `receiver_phone` VARCHAR(64) NOT NULL,
  `content` TEXT NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'sent',
  `ismy` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` INT NOT NULL,
  `updated_at` INT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sender_receiver` (`sender_id`, `receiver_phone`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `la_conversations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(64) NOT NULL,
  `phone` VARCHAR(64) NOT NULL,
  `last_message` TEXT,
  `last_message_time` INT NOT NULL DEFAULT 0,
  `unread_count` INT NOT NULL DEFAULT 0,
  `created_at` INT NOT NULL DEFAULT 0,
  `updated_at` INT NOT NULL DEFAULT 0,
  `ismy` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_phone` (`user_id`, `phone`),
  KEY `idx_last_message_time` (`last_message_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `la_contacts` (`user_id`, `phone`, `name`, `created_at`, `updated_at`)
VALUES
  (0, '10086', '中国移动', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (0, '10010', '中国联通', UNIX_TIMESTAMP(), UNIX_TIMESTAMP()),
  (0, '10000', '中国电信', UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `updated_at` = VALUES(`updated_at`);

