const { Worker } = require('bullmq');
const { Op } = require('sequelize');
const model = require('../models/index');
const sequelize = require('../config/database');
const { mailer } = require('../config/mailer');
const moment = require('moment-timezone');
const { connection } = require('../config/queue');
require('dotenv').config();

// 1. Worker xử lý hủy đơn chờ thanh toán (PENDING -> CANCELLED)
const cancelPendingWorker = new Worker('cancelPending', async job => {
    const { reservationId } = job.data;
    const t = await sequelize.transaction();
    try {
        const res = await model.Reservation.findOne({
            where: { id: reservationId, status: 'PENDING' },
            transaction: t
        });

        if (res) {
            await Promise.all([
                model.Reservation.update({ status: 'CANCELLED' }, { where: { id: reservationId }, transaction: t }),
                model.ReservationBlock.update({ status: 'CANCELLED' }, { where: { reservationId: reservationId }, transaction: t }),
                model.Payment.update({ status: 'FAILED' }, { where: { reservationId: reservationId }, transaction: t })
            ]);
            console.log(`[MQ] Cancelled PENDING reservation ${reservationId}`);
        }
        await t.commit();
    } catch (err) {
        await t.rollback();
        console.error(`[MQ Error] Cancel Pending:`, err);
    }
}, { connection });

// 2. Worker xử lý đơn KHÔNG ĐẾN (CONFIRMED -> NOSHOW)
const noShowWorker = new Worker('noShow', async job => {
    const { reservationId } = job.data;
    const t = await sequelize.transaction();
    try {
        const res = await model.Reservation.findOne({
            where: { id: reservationId, status: 'CONFIRMED' },
            include: [{
                model: model.Payment,
                attributes: ['costParking'],
                where: { status: "SUCCEEDED" }
            }],
            transaction: t
        });

        if (res) {
            const cost = res.Payment ? res.Payment.costParking : 0;
            const bill = {
                channel: 'ONLINE',
                payedMoney: cost,
                startTime: res.dateIn,
                finishTime: res.dateOut,
                totalPrice: 0,
                urlCloudinaryCheckIn: null,
                urlCloudinaryCheckOut: null,
                ticketId: null,
            };

            await Promise.all([
                model.Reservation.update({ status: 'NOSHOW' }, { where: { id: reservationId }, transaction: t }),
                model.ReservationBlock.update({ status: 'NOSHOW' }, { where: { reservationId: reservationId }, transaction: t }),
                model.Bill.create(bill, { transaction: t })
            ]);
            console.log(`[MQ] Updated CONFIRMED to NOSHOW for reservation ${reservationId}`);
        }
        await t.commit();
    } catch (err) {
        await t.rollback();
        console.error(`[MQ Error] No-Show Worker:`, err);
    }
}, { connection });

// 3. Worker xử lý gửi email cảnh báo (15p trước khi hết giờ)
const emailWarningWorker = new Worker('emailWarning', async job => {
    const { reservationId } = job.data;
    try {
        const res = await model.Reservation.findOne({
            where: { id: reservationId, status: 'CHECKIN' },
            raw: true
        });

        if (res) {
            const user = await model.Customer.findByPk(res.userId);
            if (user && user.gmail) {
                await mailer.sendMail({
                    to: user.gmail,
                    from: process.env.GMAIL_USER,
                    subject: "Cảnh báo hết giờ đỗ xe",
                    html: `Chào bạn, thời gian đặt chỗ của bạn sắp hết (còn 15 phút), vui lòng ra bãi để lấy xe.`
                });
                console.log(`[MQ] Sent warning email to user ${res.userId}`);
            }
        }
    } catch (err) {
        console.error(`[MQ Error] Email Warning:`, err);
    }
}, { connection });


module.exports = {
    cancelPendingWorker,
    noShowWorker,
    emailWarningWorker
};
