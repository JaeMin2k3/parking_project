// cronJobs.js
const cron = require('node-cron');
const { Op } = require('sequelize');
const model = require('./models/index');
const sequelize = require('./config/database');
const mailer = require('./config/mailer')
const moment = require('moment-timezone');
require('dotenv').config();
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

async function handleTimeOut(t) {
    const hour = Number(moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss").split(":")[0]);
    const affter15Time = moment().tz("Asia/Ho_Chi_Minh").add(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    const nowTime = moment().tz("Asia/Ho_Chi_Minh").format('YYYY-MM-DD HH:mm:ss');
    const reservations = await model.Reservation.findAll({
        attributes: ['userId'],
        raw: true,
        where: {
            channel: 'ONLINE',
            status: "CHECKIN",
            dateOut: {[Op.between]: [nowTime, affter15Time]}
        },
        transaction: t
    })
    if(!reservations) return 0;
    for(let i = 0 ; i < reservations.length ; i++){
        const user = await model.Customer.findByPk(reservations[i].userId);
        await mailer.sendMail({
            to: user.gmail,
            from: process.env.GMAIL_USER,
            html: `Chào bạn, thời gian đặt chỗ của bạn sắp hết, vui lòng ra bãi để lấy xe, không chúng tôi sẽ phạt tiền`
        })
    }
    return reservations.length;
}
async function joinTwoReservations(t) {
     const hour = Number(moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss").split(":")[0]);
     const date = moment().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
    const affter3Time = moment().tz("Asia/Ho_Chi_Minh").add(3, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    const nowTime = moment().tz("Asia/Ho_Chi_Minh").format('YYYY-MM-DD HH:mm:ss');
    const reservations = await model.Reservation.findAll({
        attributes: ['spotId', 'plate', 'vehicleType', 'id'],
        raw: true,
        where: {
            channel: 'ONLINE',
            status: "CHECKIN",
            dateOut: {[Op.between]: [nowTime, affter3Time]}
        },
        transaction: t
    })
    if(!reservations) return 0;
    for(let i = 0 ; i < reservations.length ; i++){
       const newReservation = await model.ReservationBlock.findOne({
        raw: true,
        attributes: ['reservationId'],
        where: {
            spotId: reservations.spotId,
            date: date,
            blockIndex: (hour + 1),
        }
       })
       if(newReservation){
        const [oldPayment, newPayment] = await Promise.all([
            model.Payment.findOne({where: {reservationId: reservations[i].id}}),
            model.Payment.findOne({where: {reservationId: newReservation.reservationId}})
        ])

            await model.Payment.update({costParking: (oldPayment.costParking + newPayment.costParking) }, {
                where: {
                    reservationId: oldPayment.reservationId
                }
            })
        }
    }
    return reservations.length;
}
function initCronJobs() {
    // Chạy mỗi phút
    cron.schedule('* * * * *', async () => {
        try {
            await sequelize.transaction(async (t) => {
                const [pendingCount, noShowCount, timeOut, twoResvations] = await Promise.all([
                    cleanPendingReservations(t),
                    cleanNoShowReservations(t),
                    handleTimeOut(t),
                    joinTwoReservations(t)
                ]);

                if (pendingCount > 0 || noShowCount > 0 || timeOut > 0 || twoResvations > 0) {
                    console.log(` Cleaned: ${pendingCount} Pending Timeout | ${noShowCount} No-Show | reservation time out: ${timeOut} || join two reservations: ${twoResvations}` );
                }else{
                   
                }
            });
        } catch (err) {
            console.error('Error crons in cleanup tasks:', err);
        }
    });
}

module.exports = { initCronJobs };