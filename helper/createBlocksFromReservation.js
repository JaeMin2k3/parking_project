
const model = require('../models/index')

const HOLD_MINUTES = 15; // thời gian để check giữ chỗ khi thanh toán

module.exports = async function createBlocksFromReservation(reservation, dateTimeIn,dateTimeOut, transaction, plate, vehicleType) {
  const {
    id: reservationId,
    spotId,
    startBlock, 
    blockCount,
    status
  } = reservation;

  const blocks = [];
  const now = new Date();
  const expireTime = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

  // Vòng lặp chạy đủ số lượng block cần tạo
  for (let i = 0; i < blockCount; i++) {
    let currentRawHour = startBlock + i; 
    let targetDate = dateTimeIn;
    let targetBlockIndex = currentRawHour;

    // nếu giờ hiện tại chạm 24 sang ngày mới - xử lí
    if (currentRawHour > 23) {
      targetDate = dateTimeOut;    // dán ngày hôm sau  
      targetBlockIndex = currentRawHour - 24; 
    }

    blocks.push({
      reservationId,
      spotId,
      date: targetDate,        
      blockIndex: targetBlockIndex, 
      expireTime,
      status: status || 'PENDING',
      plate: plate,
      vehicleType: vehicleType
    });
  }

 // insert nhiều hàm cùng 1 lúc
  await model.ReservationBlock.bulkCreate(blocks, { transaction });
};