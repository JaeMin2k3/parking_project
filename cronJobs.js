// cronJobs.js
const cron = require('node-cron');
const { Op } = require('sequelize');
const model = require('./models/index');
const sequelize = require('./config/database');
const { mailer } = require('./config/mailer');
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
    console.log(overTimeReservations)
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
            totalPrice: 0, 
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

async function handleTimeOut() {
    const affter15Time = moment().tz("Asia/Ho_Chi_Minh").add(15, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    const affter13Time = moment().tz("Asia/Ho_Chi_Minh").add(13, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    const reservations = await model.Reservation.findAll({
        attributes: ['userId'],
        raw: true,
        where: {
            channel: 'ONLINE',
            status: "CHECKIN",
            dateOut: {[Op.between]: [affter13Time, affter15Time]}
        },
    })
    if (!reservations || reservations.length === 0) return 0;
    const emailPromises = reservations.map(async (res) => {
        const user = await model.Customer.findByPk(res.userId);
        if (user && user.gmail) {
             await  mailer.sendMail({
                to: user.gmail,
                from: process.env.GMAIL_USER,
                subject: "Cảnh báo hết giờ đỗ xe",
                html: `Chào bạn, thời gian đặt chỗ của bạn sắp hết (còn 15 phút), vui lòng ra bãi để lấy xe.`
            }).catch(err => console.error(`Failed to email user ${res.userId}`, err));
        }
    });
    await Promise.all(emailPromises);
    return reservations.length;
}
async function joinTwoReservations(t) {
    const nowMoment = moment().tz("Asia/Ho_Chi_Minh");
    
    //  Tạo khung giờ tìm kiếm
    const nowTime = nowMoment.format('YYYY-MM-DD HH:mm:ss');
    const after3Time = nowMoment.clone().add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');

    //  Tính toán Block kế tiếp
    let currentHour = Number(nowMoment.format("H")); 
    let nextBlockIndex = currentHour + 1;
    let nextBlockDate = nowMoment.format("YYYY-MM-DD");

    if (currentHour === 23) {
        nextBlockIndex = 0; 
        nextBlockDate = nowMoment.clone().add(1, 'days').format("YYYY-MM-DD"); 
    }

    // 3. Tìm các đơn đang CHECKIN sắp hết giờ
    const reservations = await model.Reservation.findAll({
        attributes: ['spotId', 'plate', 'vehicleType', 'id', 'dateOut'], 
        raw: true,
        where: {
            channel: 'ONLINE',
            status: "CHECKIN",
            dateOut: { [Op.between]: [nowTime, after3Time] }
        },
        transaction: t
    });

    if (!reservations || reservations.length === 0) return 0;

    let mergedCount = 0;

   
    for (const currentRes of reservations) {
        try {
            console.log("tìm thấy")
        // Tìm xem có đơn nào  ở khung giờ tiếp theo cùng vị trí không
        const nextResBlock = await model.ReservationBlock.findOne({
            attributes: ['reservationId'],
            where: {
                 
                date: nextBlockDate,        
                blockIndex: 16, //nextBlockIndex
                status: 'CONFIRMED'           
            },
            transaction: t
        });

        if (nextResBlock) {
            const nextResId = nextResBlock.reservationId;
            console.log(nextResId)
            // Lấy thông tin thanh toán của cả 2 đơn
            const [oldPayment, newPayment] = await Promise.all([
                model.Payment.findOne( {where: {reservationId: currentRes.id }, transaction: t }),
                model.Payment.findOne( {where: {reservationId: nextResId }, transaction: t })
            ]);
            
            // Lấy thông tin thời gian kết thúc của đơn mới để gán cho đơn cũ
            const nextReservationInfo = await model.Reservation.findByPk(nextResId, {
                raw: true,
                attributes: ['dateOut'],
                transaction: t
            });
            
            if (oldPayment && newPayment && nextReservationInfo) {
                console.log("checkout")
                const oldCost = parseFloat(oldPayment.costParking) || 0;
                const newCost = parseFloat(newPayment.costParking) || 0;
                const totalCost = oldCost + newCost;
                await Promise.all([
                    //  Dồn tiền đơn mới vào đơn cũ
                    model.Payment.update(
                        { costParking: totalCost },
                        { where: { reservationId: currentRes.id }, transaction: t }
                    ),

                    // Cập nhật dateOut đơn cũ = dateOut đơn mới
                    model.Reservation.update(
                        { dateOut: nextReservationInfo.dateOut },
                        { where: { id: currentRes.id }, transaction: t }
                    ),

                    //  HỦY ĐƠN MỚI
                    model.Reservation.update(
                        { status: "CHECKOUT" },
                        { where: { id: nextResId }, transaction: t }
                    ),
                    // Update bảng ReservationBlock
                    model.ReservationBlock.update(
                        { status: "CHECKOUT" },
                        { where: { reservationId: nextResId }, transaction: t }
                    ),
                    // Update Payment đơn mới thành 0 hoặc đánh dấu đã chuyển
                    model.Payment.update(
                        { costParking: 0},
                        { where: { reservationId: nextResId }, transaction: t }
                    )
                ]);
                mergedCount++;
            }
        }
        } catch (error) {
            console.log(error)
        }
        
    }
    return mergedCount;
}
function initCronJobs() {
    // Chạy mỗi phút
    cron.schedule('* * * * *', async () => {
        try {
            await sequelize.transaction(async (t) => {
                const [pendingCount, noShowCount, timeOut, twoResvations] = await Promise.all([
                    cleanPendingReservations(t),
                    cleanNoShowReservations(t),
                    handleTimeOut(),
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