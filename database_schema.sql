SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS parking_project;
CREATE DATABASE parking_project CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parking_project;

CREATE TABLE `Customer` (
  `username` VARCHAR(30) NOT NULL PRIMARY KEY,
  `password_hash` VARCHAR(255) NOT NULL,
  `gmail` VARCHAR(255) NOT NULL UNIQUE,
  `role` VARCHAR(255) DEFAULT 'Customer',
  `verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Staff` (
  `username` VARCHAR(30) NOT NULL PRIMARY KEY,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `role` ENUM('Staff', 'admin') DEFAULT 'Staff',
  `status` BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Spot` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `area` CHAR(1) NOT NULL,
  `position` INT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `vehicleType` ENUM('CAR', 'MOTORBIKE') NOT NULL,
  `slotType` ENUM('ONLINE', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
  `status` BOOLEAN DEFAULT TRUE COMMENT 'true=available, false=occupied',
  UNIQUE KEY `unique_area_position` (`area`, `position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ParkingRate` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `vehicleType` ENUM('CAR', 'MOTORBIKE') NOT NULL DEFAULT 'CAR',
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `unitPrice` DECIMAL(12,2) NOT NULL,
  `ticketType` ENUM('STANDARD', 'OVERTIME') NOT NULL,
  `block` INT DEFAULT 1 COMMENT 'Time block in hours',
  `status` ENUM('active', 'inactive') NOT NULL,
  `gracePeriod` INT DEFAULT 15 COMMENT 'Grace period in minutes',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Reservation` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `SpotId` BIGINT UNSIGNED NULL,
  `user_id` VARCHAR(30) NULL COMMENT 'Customer username',
  `dateIn` DATE NOT NULL,
  `dateOut` DATE NULL,
  `startBlock` INT UNSIGNED NULL COMMENT 'Start hour (0-23)',
  `blockCount` INT UNSIGNED NULL COMMENT 'Number of consecutive hours',
  `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKIN', 'CHECKOUT', 'NOSHOW') NOT NULL DEFAULT 'PENDING',
  `channel` ENUM('ONLINE', 'OFFLINE') NOT NULL,
  `plate` VARCHAR(13) NOT NULL,
  `vehicleType` ENUM('CAR', 'MOTORBIKE') NOT NULL,
  `isOverNight` BOOLEAN DEFAULT FALSE,
  UNIQUE KEY `unique_Reservation` (`dateIn`, `startBlock`, `plate`, `vehicleType`),
  CONSTRAINT `fk_Reservation_Spot` 
    FOREIGN KEY (`SpotId`) REFERENCES `Spot` (`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_Reservation_Customer` 
    FOREIGN KEY (`user_id`) REFERENCES `Customer` (`username`) 
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ReservationBlock` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ReservationId` BIGINT UNSIGNED NOT NULL,
  `SpotId` BIGINT UNSIGNED NOT NULL,
  `date` DATE NOT NULL,
  `plate` VARCHAR(13) NOT NULL,
  `vehicleType` ENUM('CAR', 'MOTORBIKE') NOT NULL,
  `blockIndex` INT UNSIGNED NOT NULL COMMENT 'Hour of the day (0-23)',
  `expireTime` DATETIME NOT NULL,
  `status` ENUM('CONFIRMED', 'CANCELLED', 'PENDING', 'NOSHOW', 'CHECKIN') DEFAULT 'PENDING',
  UNIQUE KEY `unique_Spot_date_block` (`SpotId`, `date`, `blockIndex`),
  UNIQUE KEY `unique_Reservation_block` (`ReservationId`, `blockIndex`),
  CONSTRAINT `fk_block_Reservation` 
    FOREIGN KEY (`ReservationId`) REFERENCES `Reservation` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_block_Spot` 
    FOREIGN KEY (`SpotId`) REFERENCES `Spot` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Ticket` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ReservationId` BIGINT UNSIGNED NULL UNIQUE,
  `SpotId` BIGINT UNSIGNED NOT NULL,
  `StaffUsername` VARCHAR(30) NULL,
  `date` DATE NOT NULL,
  `plate` VARCHAR(20) NOT NULL,
  `vehicleType` ENUM('CAR', 'MOTORBIKE') NOT NULL,
  `bookedStart` INT UNSIGNED NULL COMMENT 'Booked start hour',
  `bookedEnd` INT UNSIGNED NULL COMMENT 'Booked end hour',
  `startTime` DATETIME NOT NULL,
  `finishTime` DATETIME NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `urlCloudinaryCheckIn` VARCHAR(100) NULL,
  CONSTRAINT `fk_Ticket_Reservation` 
    FOREIGN KEY (`ReservationId`) REFERENCES `Reservation` (`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_Ticket_Spot` 
    FOREIGN KEY (`SpotId`) REFERENCES `Spot` (`id`) 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_Ticket_Staff` 
    FOREIGN KEY (`StaffUsername`) REFERENCES `Staff` (`username`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Bill` (
  `idBill` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `TicketId` BIGINT UNSIGNED NOT NULL UNIQUE,
  `channel` ENUM('ONLINE', 'OFFLINE') NOT NULL,
  `payedMoney` DECIMAL(12,2) NOT NULL,
  `startTime` DATETIME NOT NULL,
  `finishTime` DATETIME NOT NULL,
  `totalPrice` DECIMAL(12,2) NOT NULL,
  `urlCloudinaryCheckIn` VARCHAR(100) NULL,
  `urlCloudinaryCheckOut` VARCHAR(100) NULL,
  CONSTRAINT `fk_Bill_Ticket` 
    FOREIGN KEY (`TicketId`) REFERENCES `Ticket` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Payment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ReservationId` BIGINT UNSIGNED NULL,
  `costParking` DECIMAL(12,2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `status` ENUM('SUCCEEDED', 'FAILED', 'PENDING') DEFAULT 'PENDING',
  `vnpTxnRef` VARCHAR(50) NOT NULL UNIQUE COMMENT 'VNPay transaction reference',
  CONSTRAINT `fk_Payment_Reservation` 
    FOREIGN KEY (`ReservationId`) REFERENCES `Reservation` (`id`) 
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserVerify` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `gmail_Customer` VARCHAR(255) NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  UNIQUE KEY `unique_token` (`token_hash`),
  CONSTRAINT `fk_verify_Customer` 
    FOREIGN KEY (`gmail_Customer`) REFERENCES `Customer` (`gmail`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserReset` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `gmail` VARCHAR(255) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL UNIQUE,
  `expiresAt` DATETIME NOT NULL,
  `useAt` DATETIME NULL,
  CONSTRAINT `fk_reset_Customer` 
    FOREIGN KEY (`gmail`) REFERENCES `Customer` (`gmail`) 
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- USEFUL QUERIES FOR REFERENCE
-- ============================================

-- Get available Spot for online booking (by vehicle type)
-- SELECT * FROM Spot 
-- WHERE isActive = TRUE 
--   AND slotType = 'ONLINE' 
--   AND vehicleType = 'CAR' 
--   AND status = TRUE;

-- Get all active Reservation
-- SELECT r.*, s.area, s.position, c.username, c.gmail
-- FROM Reservation r
-- JOIN Spot s ON r.SpotId = s.id
-- JOIN Customer c ON r.user_id = c.username
-- WHERE r.status IN ('CONFIRMED', 'CHECKIN')
-- ORDER BY r.dateIn, r.startBlock;

-- Get daily revenue
-- SELECT 
--   DATE(b.startTime) as date,
--   SUM(b.totalPrice) as total_revenue,
--   COUNT(*) as transaction_count
-- FROM Bill b
-- GROUP BY DATE(b.startTime)
-- ORDER BY date DESC;

-- Get vehicle type statistics
-- SELECT 
--   vehicleType,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Ticket), 2) as percentage
-- FROM Ticket
-- GROUP BY vehicleType;

-- ============================================
-- END OF SCHEMA
-- ============================================
