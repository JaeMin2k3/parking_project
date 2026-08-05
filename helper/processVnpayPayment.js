const model = require('../models/index')
const vnpay = require('../config/vnpay');
const sequelize = require('../config/database');
const { noShowQueue } = require('../config/queue');
module.exports = async function processVnpayPayment(query) {
  const verify = vnpay.verifyIpnCall(query);
  if (!verify.isSuccess) {
    return { RspCode: "97", Message: "Checksum failed" };
  }

  const { vnp_TxnRef, vnp_Amount, vnp_ResponseCode } = query;

  const payment = await model.Payment.findOne({
    where: { vnpTxnRef: vnp_TxnRef },
  });

  if (!payment) {
    return { RspCode: "01", Message: "Order not found" };
  }

  if (Number(payment.costParking) !== Number(vnp_Amount / 100)) {
    return { RspCode: "04", Message: "Invalid amount" };
  }

  if (payment.status === "SUCCEEDED" || payment.status === "FAILED") {
    return { RspCode: "02", Message: "Order already confirmed" };
  }

  const t = await sequelize.transaction();

  try {
    if (vnp_ResponseCode === "00") {
      await Promise.all([
        model.Payment.update(
          { status: "SUCCEEDED" },
          { where: { reservationId: payment.reservationId }, transaction: t }
        ),
        model.Reservation.update(
          { status: "CONFIRMED" },
          { where: { id: payment.reservationId }, transaction: t }
        ),
        model.ReservationBlock.update(
          { status: "CONFIRMED" },
          {
            where: {
              reservationId: payment.reservationId,
              status: "PENDING",
            },
            transaction: t,
          }
        ),
      ]);

      // MQ: Fetch reservation dateOut to schedule No-Show task
      const confirmedRes = await model.Reservation.findByPk(payment.reservationId, { transaction: t });
      if (confirmedRes && confirmedRes.dateOut) {
          const delayMs = new Date(confirmedRes.dateOut).getTime() - Date.now();
          if (delayMs > 0) {
              await noShowQueue.add('noshow-job', { reservationId: payment.reservationId }, { delay: delayMs });
          } else {
              await noShowQueue.add('noshow-job', { reservationId: payment.reservationId }, { delay: 1000 }); // execute immediately
          }
      }

    } else {
      await Promise.all([
        model.Payment.update(
          { status: "FAILED" },
          { where: { reservationId: payment.reservationId }, transaction: t }
        ),
        model.Reservation.update(
          { status: "CANCELLED" },
          { where: { id: payment.reservationId }, transaction: t }
        ),
        model.ReservationBlock.update(
          { status: "CANCELLED" },
          {
            where: {
              reservationId: payment.reservationId,
              status: "PENDING",
            },
            transaction: t,
          }
        ),
      ]);
    }

    await t.commit();
    return { RspCode: "00", Message: "Success" };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
