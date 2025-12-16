const bcrypt = require('bcrypt');

const admin = "123456";
console.log(bcrypt.hashSync(admin,10));
tk: admin, mk: $2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi



INSERT INTO spots (area, position, isActive, vehicleType, slotType, createdAt, updatedAt)
WITH RECURSIVE NumberSeries AS (
    -- Tạo chuỗi số từ 1 đến 100
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM NumberSeries WHERE n < 100
)
-- Phần 1: Tạo dữ liệu cho CAR (Khu A)
SELECT 
    'A' AS area,
    n AS position,
    1 AS isActive,
    'CAR' AS vehicleType,
    CASE WHEN n <= 70 THEN 'OFFLINE' ELSE 'ONLINE' END AS slotType,
    NOW(),
    NOW()
FROM NumberSeries
UNION ALL
-- Phần 2: Tạo dữ liệu cho MOTORBIKE (Khu B)
SELECT 
    'B' AS area,
    n AS position, -- Vẫn chạy từ 1 đến 100 cho khu B
    1 AS isActive,
    'MOTORBIKE' AS vehicleType,
    CASE WHEN n <= 70 THEN 'OFFLINE' ELSE 'ONLINE' END AS slotType,
    NOW(),
    NOW()
FROM NumberSeries;

INSERT INTO staff (username, password_hash, name, date, role, status, createdAt, updatedAt)
VALUES
('staff2', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 2', '2025-11-14', 'staff', 1, NOW(), NOW()),
('staff3', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 3', '2025-11-14', 'staff', 1, NOW(), NOW()),
('staff4', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 4', '2025-11-14', 'staff', 1, NOW(), NOW()),
('staff5', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 5', '2025-11-14', 'staff', 1, NOW(), NOW()),
('staff6', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 6', '2025-11-14', 'staff', 1, NOW(), NOW()),
('staff7', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 7', '2025-11-14', 'staff', 1, NOW(), NOW()),
('staff8', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 8', '2025-11-14', 'staff', 1, NOW(), NOW()),
('staff9', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 9', '2025-11-14', 'staff', 1, NOW(), NOW()),
('staff10', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Nhân viên 10', '2025-11-14', 'staff', 1, NOW(), NOW()),
('admin', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'Quản trị viên', '2025-11-14', 'admin', 1, NOW(), NOW());

INSERT INTO `parking_project`.`customer` (`username`, `password_hash`, `gmail`, `role`, `verified`, `status`) VALUES ('0987287665', '$2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi', 'minhsiu9999@gmail.com', 'customer', 0, 1);
INSERT INTO parkingrate 
(vehicleType, currency, unitPrice, ticketType, block, status, gracePeriod, createdAt, updatedAt) 
VALUES 
-- 1. Ô TÔ - GIÁ CHUẨN (10k / 1 giờ)
('CAR', 'VND', 10000, 'STANDARD', 1, 'active', 0, NOW(), NOW()),

-- 2. Ô TÔ - GIÁ PHẠT QUÁ GIỜ (20k / 1 giờ - Ân hạn 15p)
('CAR', 'VND', 20000, 'OVERTIME', 1, 'active', 15, NOW(), NOW()),

-- 3. XE MÁY - GIÁ CHUẨN (5k / 1 giờ)
('MOTORBIKE', 'VND', 5000, 'STANDARD', 1, 'active', 0, NOW(), NOW()),

-- 4. XE MÁY - GIÁ PHẠT QUÁ GIỜ (10k / 1 giờ - Ân hạn 15p)
('MOTORBIKE', 'VND', 10000, 'OVERTIME', 1, 'active', 15, NOW(), NOW());



INSERT INTO `parking_project`.`reservations`
(`dateIn`, `dateOut`, `startBlock`, `blockCount`, `status`, `channel`,
 `plate`, `vehicleType`, `isOverNight`,
 `userId`, `spotId`)
VALUES
('2025-12-05', '2025-12-05', 21, 3, 'CONFIRMED', 'ONLINE',
 '37A55555', 'CAR', 0,  '0987287665', 198);



 INSERT INTO parking_project.reservationblocks
    (`date`, `plate`, `vehicleType`,
     `blockIndex`, `expireTime`, `status`,
     `reservationId`, `spotId`)
VALUES
    ('2025-12-05', '37A55555', 'CAR',
     21, NOW(), 'CONFIRMED',
     1, 198),
    ('2025-12-05', '37A55555', 'CAR',
     22, NOW(), 'CONFIRMED',
     1, 198),
     ('2025-12-05', '37A55555', 'CAR',
     23, NOW(), 'CONFIRMED',
     1, 198);


     INSERT INTO `parking_project`.`payments` (`id`, `costParking`, `currency`, `status`, `vnpTxnRef`, `reservationId`) VALUES (1, 30000, 'VND', 'SUCCEEDED', 'ádfasfsdfsf', 1);
