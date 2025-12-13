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
    const now = new Date()
     const date = now.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).split(" ")[0];
    // console.log(date);
    const hours = now.getHours() + (now.getMinutes() / 60);
    // console.log(hours);
    // lấy toàn bộ reservation đã thanh toán thành công
    const noShowReservations = await model.Reservation.findAll({
        attributes: ['id', 'isOverNight', 'startBlock', 'blockCount', 'dateIn', 'dateOut'],
        where: {
            status: 'CONFIRMED',
            channel: 'ONLINE'
        },
        include: [
            {
                model: model.Payment,
                attribute: ['costParking'],
                where: {
                    status: "SUCCEEDED"
                },
            }
        ],
        transaction: t
    });
    const bill = [];
    const overTimeReservation = [];
    const map = noShowReservations.map(r => {
         let endTime = r.startBlock + r.blockCount
         let payedMoney = (r.Payments && r.Payments.length > 0) ? r.Payments[0].costParking : 0;
        if(date > r.dateOut){
            console.log("quá ngày quá nhiều rồi")
            overTimeReservation.push(r.id);
                    bill.push({
                        channel: 'ONLINE',
                        payedMoney: payedMoney,
                        startTime: date,
                        finishTime: date,
                        totalPrice: 0,
                        ticketId: null,
                    })
        }
        else{ 
            if(r.isOverNight){
            console.log(r.Payments);
            if(date > r.dateIn){
                console.log("qua ngày rồi")
                // qua ngày rồi
                 endTime = endTime - 24;
                if(endTime < hours) {
                    
                    overTimeReservation.push(r.id);
                    bill.push({
                        channel: 'ONLINE',
                        payedMoney: payedMoney,
                        startTime: date,
                        finishTime: date,
                        totalPrice: 0,
                        ticketId: null,
                    })
                }
            }
            }else{
                if(hours > endTime){
                    overTimeReservation.push(r.id);
                    bill.push({
                            channel: 'ONLINE',
                            payedMoney: payedMoney,
                            startTime: date,
                            finishTime: date,
                            totalPrice: 0,
                            ticketId: null,
                        })
                }
            }
        }
    });
    // console.log("các id not show" + overTimeReservation)
    if (overTimeReservation.length === 0) return 0;

    // Update trạng thái reservation quá thời gian đỗ mà khách không đến checkin và update thêm reservationblock
    await Promise.all([
        model.Reservation.update({ status: 'NOSHOW' }, 
            { where: { id: overTimeReservation }, transaction: t }),
        model.ReservationBlock.update({ status: 'NOSHOW' }, 
            { where: { reservationId: overTimeReservation }, transaction: t }),
        model.Bill.bulkCreate(bill, {transaction: t})
    ]);

    return overTimeReservation.length;

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