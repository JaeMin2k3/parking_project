// models/index.js hoặc chỗ bạn export model
const { Reservation, ReservationBlock } = require('../models');

const HOLD_MINUTES = 15; // thời gian giữ chỗ nếu chưa pay

module.exports = async function createBlocksFromReservation(reservation, transaction) {
  const {
    id: reservationId,
    spotId,
    date,
    startBlock,
    blockCount,
    status
  } = reservation;

  const blocks = [];
  const now = new Date();
  const expireTime = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

  // tạo list blockIndex: startBlock .. startBlock + blockCount - 1
  const endBlock = startBlock + blockCount; // [startBlock, endBlock)
  for (let blockIndex = startBlock; blockIndex < endBlock; blockIndex++) {
    blocks.push({
      reservationId,
      spotId,
      date,
      blockIndex,
      expireTime,
      status: status || 'PENDING',
    });
  }

  // tạo nhiều dòng 1 lần
  await ReservationBlock.bulkCreate(blocks, { transaction });
}


