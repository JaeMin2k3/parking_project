// cronJobs.js
const cron = require('node-cron');
const { Op } = require('sequelize');
const model = require('./models/index')
const sequelize = require('./config/database')
// Hàm khởi tạo các cron job
function initCronJobs() {
  // Chạy mỗi phút: "* * * * *"
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    console.log('[CRON] Checking expired reservations at', now.toISOString());

    try {
      // 1. Lấy các reservationId có block PENDING đã hết hạn
      const expiredBlocks = await model.ReservationBlock.findAll({
        where: {
          status: 'PENDING',
          expireTime: { [Op.lte]: now }
        },
        attributes: ['reservationId'],
        group: ['reservationId']    // tránh trùng nhiều block
      });

      const reservationIds = expiredBlocks.map(b => b.reservationId);
      if (reservationIds.length === 0) return; // không có gì để xử lý

      await sequelize.transaction(async (t) => {
        // 2. Cập nhật Reservation -> CANCELLED (nếu vẫn đang PENDING)
        await model.Reservation.update(
          { status: 'CANCELLED' },
          {
            where: {
              id: { [Op.in]: reservationIds },
              status: 'PENDING'
            },
            transaction: t
          }
        );

        // 3. Cập nhật tất cả block của các reservation này -> CANCELLED
        await model.ReservationBlock.update(
          { status: 'CANCELLED' },
          {
            where: {
              reservationId: { [Op.in]: reservationIds },
              status: 'PENDING'
            },
            transaction: t
          }
        );
      });

      console.log(`[CRON] Auto-cancelled ${reservationIds.length} reservations`);
    } catch (err) {
      console.error('[CRON] Error while cancelling expired reservations:', err);
    }
  });
}

module.exports = { initCronJobs };
