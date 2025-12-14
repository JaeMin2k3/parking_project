// cronJobs.js
const cron = require('node-cron');
const { Op } = require('sequelize');
const model = require('./models/index');
const sequelize = require('./config/database');


//  Xử lý đơn chờ thanh toán quá hạn (PENDING -> CANCELLED)

async function cleanPendingReservations(t) {
    const now = new Date();
    
    // 1. Tìm các Block PENDING đã hết hạn giữ chỗ (expireTime)
    const expiredBlocks = await model.ReservationBlock.findAll({
        where: {
            status: 'PENDING',
            expireTime: { [Op.lte]: now }
        },
        attributes: ['reservationId'],
        group: ['reservationId'],
        transaction: t 
    });

    const reservationIds = expiredBlocks.map(b => b.reservationId);
    if (reservationIds.length === 0) return 0;

    // 2. Update trạng thái
    await Promise.all([
        model.Reservation.update({ status: 'CANCELLED' }, 
            { where: { id: reservationIds, status: 'PENDING' }, transaction: t }),
        
        model.ReservationBlock.update({ status: 'CANCELLED' }, 
            { where: { reservationId: reservationIds }, transaction: t }),
        
        model.Payment.update({ status: 'FAILED' }, 
            { where: { reservationId: reservationIds, status: 'PENDING' }, transaction: t })
    ]);

    return reservationIds.length;
}


// Xử lý đơn đã đặt nhưng KHÔNG ĐẾN (CONFIRMED -> NO_SHOW)

async function cleanNoShowReservations(t) {
    const now = new Date();
    
    const overTimeReservations = await model.Reservation.findAll({
        attributes: ['id', 'isOverNight', 'startBlock', 'blockCount', 'dateIn', 'dateOut'],
        where: {
            status: 'CONFIRMED',
            channel: 'ONLINE',
            dateOut: { [Op.lt]: now } 
        },
        include: [
            {
                model: model.Payment,
                attributes: ['costParking'], 
                where: {
                    status: "SUCCEEDED"
                },
            }
        ],
        raw: true, 
        transaction: t
    });

    if (overTimeReservations.length === 0) return 0;

    // Chuẩn bị dữ liệu
    const reservations = [];
    const bills = [];

    overTimeReservations.forEach(reservation => {
        reservations.push(reservation.id);
        const cost = reservation['Payment.costParking'] || 0; 

        bills.push({
            channel: 'ONLINE',
            payedMoney: cost,
            startTime: reservation.dateIn,
            finishTime: reservation.dateOut,
            totalPrice: 0, // Hoặc bằng 'cost' nếu bạn muốn ghi nhận doanh thu này
            urlCloudinaryCheckIn: null,
            urlCloudinaryCheckOut: null,
            ticketId: null,
        });
    });

    // Thực hiện Update và Insert song song
    await Promise.all([
        model.Reservation.update({ status: 'NOSHOW' }, 
            { where: { id: reservations }, transaction: t }),
            
        model.ReservationBlock.update({ status: 'NOSHOW' }, 
            { where: { reservationId: reservations }, transaction: t }),
            
        model.Bill.bulkCreate(bills, { transaction: t })
    ]);

    return overTimeReservations.length;
}


function initCronJobs() {
    // Chạy mỗi phút
    cron.schedule('* * * * *', async () => {
        try {
            await sequelize.transaction(async (t) => {
                // Chạy song song cả 2 task dọn dẹp
                const [pendingCount, noShowCount] = await Promise.all([
                    cleanPendingReservations(t),
                    cleanNoShowReservations(t)
                ]);

                if (pendingCount > 0 || noShowCount > 0) {
                    console.log(`[CRON] Cleaned: ${pendingCount} Pending Timeout | ${noShowCount} No-Show`);
                }else{
                   
                }
            });
        } catch (err) {
            console.error('[CRON] Error in cleanup tasks:', err);
        }
    });
}

module.exports = { initCronJobs };