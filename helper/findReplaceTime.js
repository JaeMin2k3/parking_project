const { Op } = require('sequelize');
const model = require('../models/index');
const moment = require('moment-timezone')
module.exports = async function findReplaceTime(reservation, transaction) {
   
    const startBlock = reservation.startBlock;
    const blockCount = reservation.blockCount;
    const endBlock = (startBlock + blockCount) % 24; 
    const isOverNight = reservation.isOverNight; 

    const blockWhereCondition = {
        status: { [Op.in]: ['CONFIRMED', 'PENDING', 'CHECKIN'] }
    };
    const dateIn = moment(reservation.dateIn).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const dateOut = moment(reservation.dateOut).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    if (!isOverNight) {
        // TRƯỜNG HỢP 1: Trong ngày
        blockWhereCondition.date = dateIn;
        blockWhereCondition.blockIndex = { [Op.between]: [startBlock, startBlock + blockCount - 1] };
    } else {
        // TRƯỜNG HỢP 2: Qua đêm 
        const orConditions = [
            {
                date: reservation.dateIn, 
                blockIndex: { [Op.between]: [startBlock, 23] }
            }
        ];

        // Chỉ check ngày hôm sau nếu giờ ra > 0
        if (endBlock > 0) {
            orConditions.push({
                date: dateOut, 
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