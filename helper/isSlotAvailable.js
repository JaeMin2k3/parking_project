const { Op } = require('sequelize');
const model = require('../models/index'); // chỉnh lại path cho đúng

// trả về true = slot rảnh, false = có trùng
module.exports = async function isSlotAvailable(spotId, date, timeIn, timeOut) {
  const newStart = Number(timeIn);   // vd 14
  const newEnd   = Number(timeOut);  // vd 17  => [14,17)

  // Lấy tất cả reservation cùng spot + date đang "chiếm chỗ"
  const reservations = await model.Reservation.findAll({
    where: {
      spotId: spotId,
      date: date,
      status: { [Op.in]: ['PENDING', 'CONFIRMED'] }
    }
  });

  // Kiểm tra xem có cái nào overlap với [newStart, newEnd) không
  const hasConflict = reservations.some(r => {
    const existingStart = r.startBlock;
    const existingEnd   = r.startBlock + r.blockCount; // [startBlock, startBlock+blockCount)

    return existingStart < newEnd && newStart < existingEnd;
  });

  return !hasConflict; // true = available, false = bị trùng
}
