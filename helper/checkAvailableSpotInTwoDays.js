const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

module.exports = async function checkAvailableSpotInTwoDays( transaction) {
  const sql1 = `
    SELECT count(*)
    FROM spots s
    LEFT JOIN reservations r
      ON r.spotId = s.id
    AND DATE(r.dateIn) IN (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY))
    AND DATE(r.dateOut) IN (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY))
    WHERE s.status = TRUE
      AND s.isActive = TRUE
      AND s.slotType = "ONLINE"
      AND s.vehicleType = "CAR"
      AND r.id IS NULL;
  `;
    const sql2 = `
    SELECT count(*)
    FROM spots s
    LEFT JOIN reservations r
      ON r.spotId = s.id
    AND DATE(r.dateIn) IN (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY))
    AND DATE(r.dateOut) IN (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY))
    WHERE s.status = TRUE
      AND s.isActive = TRUE
      AND s.slotType = "ONLINE"
      AND s.vehicleType = "MOTORBIKE"
      AND r.id IS NULL;
  `;
 const carRow = await sequelize.query(sql1, {
    type: QueryTypes.SELECT, // giúp lấy mảng các object thuần không có metadata
    plain: true,
    transaction
  });

  const motorRow = await sequelize.query(sql2, {
    type: QueryTypes.SELECT,
    plain: true,
    transaction
  });
  const car = Number(carRow['count(*)']);
    const motor = Number(motorRow['count(*)']);
  return {carSlot: car, motorSlot: motor};
};
