// generate-hash.js (CommonJS)
const bcrypt = require('bcrypt');

const hash = bcrypt.hashSync('123456', 10); // 10 = cost
console.log(hash); // sẽ in chuỗi dạng: $2b$10$...


INSERT INTO `customers`
  (`username`, `email`, `password_hash`, `role`, `status`, `email_verified`, `createdAt`, `updatedAt`)
VALUES
  ('minh', 'minh@example.com', '$2b$10$$2b$10$m6QnWM1RLZPEdqQCZtvtx./BDaWNeYbbpJcqftvJl8yEv3or8SFfm', 'customer', 'active', 1, NOW(), NOW());
