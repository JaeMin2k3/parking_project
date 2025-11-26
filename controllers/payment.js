const model = require('../models/index');
const vnpayHelper = require('../helper/vnPay');
const moment = require('moment');
require('dotenv').config();

// ========== CREATE PAYMENT FOR RESERVATION ==========

/**
 * POST /api/payment/create-reservation-payment
 * Create payment URL for reservation
 */
exports.createReservationPayment = async (req, res) => {
  const { reservationId, bankCode } = req.body;
  const customerUsername = req.user._id; // From JWT token

  if (!reservationId) {
    return res.status(400).json({ message: 'Reservation ID là bắt buộc' });
  }

  try {
    // Find reservation
    const reservation = await model.Reservation.findOne({
      where: { 
        id: reservationId,
        customerUsername 
      },
      include: [
        {
          model: model.Spot,
          include: [{ model: model.ParkingRate }]
        }
      ]
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Không tìm thấy đặt chỗ' });
    }

    if (reservation.status !== 'PENDING' && reservation.status !== 'CONFIRMED') {
      return res.status(400).json({ message: 'Đặt chỗ không thể thanh toán' });
    }

    // Check if payment already exists
    const existingPayment = await model.Payment.findOne({
      where: { 
        reservationId,
        status: 'SUCCEEDED'
      }
    });

    if (existingPayment) {
      return res.status(400).json({ message: 'Đặt chỗ đã được thanh toán' });
    }

    // Calculate amount based on block count (consecutive hours)
    const parkingRate = reservation.Spot.ParkingRate;
    if (!parkingRate) {
      return res.status(400).json({ message: 'Chưa có bảng giá cho chỗ đỗ này' });
    }

    const durationHours = reservation.blockCount || 1;

    let amount = 0;
    if (parkingRate.plan_type === 'HOURLY') {
      // For consecutive hours, simply multiply hours by hourly rate
      amount = durationHours * parseFloat(parkingRate.unit_price);
      
      // Apply daily cap if exists
      if (parkingRate.daily_cap && amount > parseFloat(parkingRate.daily_cap)) {
        amount = parseFloat(parkingRate.daily_cap);
      }
    } else if (parkingRate.plan_type === 'DAILY') {
      const numberOfDays = Math.ceil(durationHours / 24);
      amount = numberOfDays * parseFloat(parkingRate.unit_price);
    } else if (parkingRate.plan_type === 'WEEKLY') {
      const numberOfWeeks = Math.ceil(durationHours / (24 * 7));
      amount = numberOfWeeks * parseFloat(parkingRate.unit_price);
    } else if (parkingRate.plan_type === 'MONTHLY') {
      const numberOfMonths = Math.ceil(durationHours / (24 * 30));
      amount = numberOfMonths * parseFloat(parkingRate.unit_price);
    }

    // Create payment record
    const orderId = `RES${reservationId}_${Date.now()}`;
    
    const payment = await model.Payment.create({
      reservationId,
      amount,
      currency: 'VND',
      payment_method: 'VNPAY',
      status: 'PENDING',
      transaction_id: orderId
    });

    // Get client IP
    const ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   req.connection.socket.remoteAddress;

    // Create VNPay payment URL
    const startHour = reservation.startBlock;
    const endHour = reservation.startBlock + reservation.blockCount;
    const paymentUrl = vnpayHelper.createPaymentUrl({
      orderId: orderId,
      amount: Math.round(amount), // Round to integer
      orderDescription: `Dat cho ${reservation.Spot.area}-${reservation.Spot.position} ${startHour}h-${endHour}h - ${reservation.plate}`,
      orderType: 'billpayment',
      language: 'vn',
      bankCode: bankCode || '',
      ipAddr: ipAddr
    });
    
    res.status(200).json({
      message: 'Tạo link thanh toán thành công',
      paymentUrl: paymentUrl,
      reservation: {
        date: reservation.date,
        timeRange: `${startHour}:00 - ${endHour}:00`,
        hours: reservation.blockCount
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        transaction_id: payment.transaction_id
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ========== CREATE PAYMENT FOR BILL ==========

/**
 * POST /api/payment/create-bill-payment
 * Create payment URL for parking bill
 */
exports.createBillPayment = async (req, res) => {
  const { billId, bankCode } = req.body;

  if (!billId) {
    return res.status(400).json({ message: 'Bill ID là bắt buộc' });
  }

  try {
    // Find bill
    const bill = await model.Bill.findOne({
      where: { id: billId },
      include: [
        {
          model: model.Ticket,
          attributes: ['id', 'plate', 'actual_entry', 'actual_exit']
        }
      ]
    });

    if (!bill) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    }

    if (bill.payment_status === 'PAID') {
      return res.status(400).json({ message: 'Hóa đơn đã được thanh toán' });
    }

    // Create payment order ID
    const orderId = `BILL${billId}_${Date.now()}`;

    // Update bill with transaction ID
    await bill.update({ 
      payment_method: 'VNPAY'
    });

    // Get client IP
    const ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   req.connection.socket.remoteAddress;

    // Create VNPay payment URL
    const paymentUrl = vnpayHelper.createPaymentUrl({
      orderId: orderId,
      amount: Math.round(parseFloat(bill.total_amount)), // Round to integer
      orderDescription: `Thanh toan phi gui xe ${bill.Ticket.plate}`,
      orderType: 'billpayment',
      language: 'vn',
      bankCode: bankCode || '',
      ipAddr: ipAddr
    });

    res.status(200).json({
      message: 'Tạo link thanh toán thành công',
      paymentUrl: paymentUrl,
      bill: {
        id: bill.id,
        amount: bill.total_amount,
        currency: bill.currency,
        transaction_id: orderId
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ========== VNPAY RETURN URL (User redirected here after payment) ==========

/**
 * GET /api/payment/vnpay-return
 * Handle VNPay return callback
 */
exports.vnpayReturn = async (req, res) => {
  let vnp_Params = req.query;

  try {
    // Verify signature
    const isValid = vnpayHelper.verifyReturnUrl(vnp_Params);

    if (!isValid) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Invalid_Signature`);
    }

    const responseCode = vnp_Params['vnp_ResponseCode'];
    const orderId = vnp_Params['vnp_TxnRef'];
    const amount = vnp_Params['vnp_Amount'] / 100; // Convert back to VND
    const transactionNo = vnp_Params['vnp_TransactionNo'];
    const bankCode = vnp_Params['vnp_BankCode'];
    const payDate = vnp_Params['vnp_PayDate'];

    // Check if it's a reservation or bill payment
    if (orderId.startsWith('RES')) {
      // Reservation payment
      const payment = await model.Payment.findOne({
        where: { transaction_id: orderId }
      });

      if (!payment) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Payment_Not_Found`);
      }

      if (responseCode === '00') {
        // Payment successful
        await payment.update({
          status: 'SUCCEEDED',
          payment_method: `VNPAY - ${bankCode}`
        });

        // Update reservation status
        const reservation = await model.Reservation.findByPk(payment.reservationId);
        if (reservation && reservation.status === 'PENDING') {
          await reservation.update({ status: 'CONFIRMED' });
        }

        return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}&amount=${amount}`);
      } else {
        // Payment failed
        await payment.update({
          status: 'FAILED'
        });

        const message = vnpayHelper.getResponseMessage(responseCode);
        return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=${encodeURIComponent(message)}`);
      }
    } else if (orderId.startsWith('BILL')) {
      // Bill payment
      const billIdMatch = orderId.match(/BILL(\d+)_/);
      if (!billIdMatch) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Invalid_Order_ID`);
      }

      const billId = billIdMatch[1];
      const bill = await model.Bill.findByPk(billId);

      if (!bill) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Bill_Not_Found`);
      }

      if (responseCode === '00') {
        // Payment successful
        await bill.update({
          payment_status: 'PAID',
          payment_method: `VNPAY - ${bankCode}`,
          paid_at: moment(payDate, 'YYYYMMDDHHmmss').toDate()
        });

        return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}&amount=${amount}`);
      } else {
        // Payment failed
        const message = vnpayHelper.getResponseMessage(responseCode);
        return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=${encodeURIComponent(message)}`);
      }
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Invalid_Order_Type`);
    }

  } catch (err) {
    console.error(err);
    return res.redirect(`${process.env.FRONTEND_URL}/payment/error?message=Server_Error`);
  }
};

// ========== VNPAY IPN (Instant Payment Notification) ==========

/**
 * GET /api/payment/vnpay-ipn
 * Handle VNPay IPN callback (server-to-server)
 */
exports.vnpayIPN = async (req, res) => {
  let vnp_Params = req.query;

  try {
    // Verify signature
    const isValid = vnpayHelper.verifyReturnUrl(vnp_Params);

    if (!isValid) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid Signature' });
    }

    const responseCode = vnp_Params['vnp_ResponseCode'];
    const orderId = vnp_Params['vnp_TxnRef'];
    const amount = vnp_Params['vnp_Amount'] / 100;
    const transactionNo = vnp_Params['vnp_TransactionNo'];
    const bankCode = vnp_Params['vnp_BankCode'];
    const payDate = vnp_Params['vnp_PayDate'];

    // Check if it's a reservation or bill payment
    if (orderId.startsWith('RES')) {
      // Reservation payment
      const payment = await model.Payment.findOne({
        where: { transaction_id: orderId }
      });

      if (!payment) {
        return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      }

      if (payment.status === 'SUCCEEDED') {
        return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      if (responseCode === '00') {
        // Payment successful
        await payment.update({
          status: 'SUCCEEDED',
          payment_method: `VNPAY - ${bankCode}`
        });

        // Update reservation status
        const reservation = await model.Reservation.findByPk(payment.reservationId);
        if (reservation && reservation.status === 'PENDING') {
          await reservation.update({ status: 'CONFIRMED' });
        }

        return res.status(200).json({ RspCode: '00', Message: 'Success' });
      } else {
        // Payment failed
        await payment.update({
          status: 'FAILED'
        });

        return res.status(200).json({ RspCode: '00', Message: 'Success' });
      }
    } else if (orderId.startsWith('BILL')) {
      // Bill payment
      const billIdMatch = orderId.match(/BILL(\d+)_/);
      if (!billIdMatch) {
        return res.status(200).json({ RspCode: '01', Message: 'Invalid Order ID' });
      }

      const billId = billIdMatch[1];
      const bill = await model.Bill.findByPk(billId);

      if (!bill) {
        return res.status(200).json({ RspCode: '01', Message: 'Bill not found' });
      }

      if (bill.payment_status === 'PAID') {
        return res.status(200).json({ RspCode: '02', Message: 'Bill already paid' });
      }

      if (responseCode === '00') {
        // Payment successful
        await bill.update({
          payment_status: 'PAID',
          payment_method: `VNPAY - ${bankCode}`,
          paid_at: moment(payDate, 'YYYYMMDDHHmmss').toDate()
        });

        return res.status(200).json({ RspCode: '00', Message: 'Success' });
      } else {
        return res.status(200).json({ RspCode: '00', Message: 'Success' });
      }
    } else {
      return res.status(200).json({ RspCode: '01', Message: 'Invalid Order Type' });
    }

  } catch (err) {
    console.error(err);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

// ========== QUERY PAYMENT STATUS ==========

/**
 * GET /api/payment/status/:transactionId
 * Query payment status
 */
exports.getPaymentStatus = async (req, res) => {
  const { transactionId } = req.params;

  try {
    // Check if it's a reservation payment
    const payment = await model.Payment.findOne({
      where: { transaction_id: transactionId },
      include: [
        {
          model: model.Reservation,
          include: [{ model: model.Spot }]
        }
      ]
    });

    if (payment) {
      return res.status(200).json({
        message: 'success',
        type: 'reservation',
        payment: payment
      });
    }

    // Check if it's a bill payment
    if (transactionId.startsWith('BILL')) {
      const billIdMatch = transactionId.match(/BILL(\d+)_/);
      if (billIdMatch) {
        const billId = billIdMatch[1];
        const bill = await model.Bill.findByPk(billId, {
          include: [{ model: model.Ticket }]
        });

        if (bill) {
          return res.status(200).json({
            message: 'success',
            type: 'bill',
            bill: bill
          });
        }
      }
    }

    return res.status(404).json({ message: 'Không tìm thấy giao dịch' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// ========== GET PAYMENT HISTORY ==========

/**
 * GET /api/payment/history
 * Get user's payment history
 */
exports.getPaymentHistory = async (req, res) => {
  const customerUsername = req.user._id; // From JWT token

  try {
    const payments = await model.Payment.findAll({
      include: [
        {
          model: model.Reservation,
          where: { customerUsername },
          include: [
            {
              model: model.Spot,
              attributes: ['spot_number', 'area']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.status(200).json({
      message: 'success',
      count: payments.length,
      payments: payments
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
