const { Op } = require('sequelize');
const model = require('../models/index');

// THÊM tham số vehicleType vào hàm
module.exports = async function checkAvailableTime(vehicleType, transaction) {
    const now = new Date();
    const options = { timeZone: 'Asia/Ho_Chi_Minh' };
    const isoFormat = 'sv-SE';
    const date1 = now.toLocaleDateString(isoFormat, options); 
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date2 = tomorrow.toLocaleDateString(isoFormat, options);

    const busyBlocks = await model.ReservationBlock.findAll({
        attributes: ['spotId'],
        where: {
            [Op.or]: [
                { date: date1 },
                { date: date2 }
            ],
            status: {
                [Op.in]: ['CONFIRMED', 'CHECKIN']
            }
        },
        raw: true,
        transaction
    });

    const busySpotIds = busyBlocks.map(block => block.spotId);

    const availableSpots = await model.Spot.findAll({
        where: {
            status: true,
            isActive: true,
            vehicleType: vehicleType, 
            slotType: 'ONLINE',
            id: {
                [Op.notIn]: busySpotIds 
            }
        },
        transaction,
        raw: true,
        limit: 1 // Chỉ cần check xem có slot nào không, lấy 1 cái là đủ để optimize
    });

    return availableSpots;
};