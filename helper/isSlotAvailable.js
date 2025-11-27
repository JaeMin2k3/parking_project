const { Op, Transaction } = require('sequelize');
const model = require('../models/index'); 

// Lưu ý: Thay đổi tham số đầu vào để hỗ trợ check qua đêm chính xác
module.exports = async function isSlotAvailable(spotId, dateTimeIn, dateTimeOut, startBlock, endBlock) {
  
  // 1. Xác định logic Overnight (Giống hệt Controller)
  let isOverNight= false;
  if (new Date(dateTimeIn).getDate() !== new Date(dateTimeOut).getDate()) {
      isOverNight = true;
  }
  
  const blockWhereCondition = {
    spotId: spotId, // Chỉ check đúng cái spot đang định đặt
    status: { [Op.in]: ['PENDING', 'CONFIRMED'] }
  };

  if (!isOvernight) {
    //  TRONG NGÀY 
    blockWhereCondition.date = dateTimeIn;
    blockWhereCondition.blockIndex = { [Op.between]: [startBlock, endBlock - 1] };
  } else {
    //  QUA ĐÊM 
    const orConditions = [
      {
        date: dateTimeIn,
        blockIndex: { [Op.between]: [startBlock, 23] } // Từ giờ vào đến hết ngày cũ
      }
    ];

    //  giờ ra > 0 của ngày hôm sau
    if (endBlock > 0) {
      orConditions.push({
        date: dateTimeOut,
        blockIndex: { [Op.between]: [0, endBlock - 1] } // Từ 0h đến giờ ra ngày mới
      });
    }

    blockWhereCondition[Op.or] = orConditions;
  }

  // Đếm số lượng block bị trùng
  const conflictCount = await model.ReservationBlock.count({
    where: blockWhereCondition
  });

 
  return conflictCount === 0; 
};