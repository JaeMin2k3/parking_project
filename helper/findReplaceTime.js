const { Op } = require('sequelize');
const model = require('../models/index');

module.exports = async function findReplaceTime(reservation, transaction) {
    // 1. Extract dữ liệu từ reservation để tránh lỗi undefined
    const startBlock = reservation.startBlock;
    const blockCount = reservation.blockCount;
    // Giả sử logic là start + count. Nếu bạn có logic khác để tính endBlock, hãy sửa ở đây
    const endBlock = (startBlock + blockCount) % 24; 
    
    // Logic xác định qua đêm dựa trên reservation (hoặc tính toán lại)
    // Lưu ý: Sửa lỗi chính tả resvation -> reservation
    const isOverNight = reservation.isOverNight; 

    const blockWhereCondition = {
        status: { [Op.in]: ['CONFIRMED', 'PENDING', 'CHECKIN'] }
    };

    if (!isOverNight) {
        // TRƯỜNG HỢP 1: Trong ngày
        blockWhereCondition.date = reservation.dateIn;
        blockWhereCondition.blockIndex = { [Op.between]: [startBlock, startBlock + blockCount - 1] };
    } else {
        // TRƯỜNG HỢP 2: Qua đêm 
        const orConditions = [
            {
                date: reservation.dateIn, // Sửa dateTimeIn -> reservation.dateIn
                blockIndex: { [Op.between]: [startBlock, 23] }
            }
        ];

        // Chỉ check ngày hôm sau nếu giờ ra > 0
        if (endBlock > 0) {
            orConditions.push({
                date: reservation.dateOut, // Sửa dateTimeOut -> reservation.dateOut
                blockIndex: { [Op.between]: [0, endBlock - 1] } 
            });
        }
        blockWhereCondition[Op.or] = orConditions;
    }

    const freeSpot = await model.Spot.findOne({
        attributes: ['id', 'area', 'position', 'status', 'vehicleType', 'slotType'],
        where: {
            status: true,
            isActive: true,
            vehicleType: reservation.vehicleType,
            slotType: 'ONLINE',
            // Chỉ lấy spot không có ReservationBlock nào trùng giờ (dựa vào include bên dưới)
            
        },
        '$ReservationBlocks.id$': null,
        transaction,
        paranoid: true,
        include: [
            {
                model: model.ReservationBlock,
                required: false, // Left Join
                where: blockWhereCondition
            }
        ]
    });

    return freeSpot;
}