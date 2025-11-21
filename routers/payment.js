// const express = require('express');
// const router = express.Router();
// const paymentController = require('../controllers/payment');
// const { verifyToken, isCustomer } = require('../middleware/jwt');

// // Create payment URLs (Protected - Customer only)
// router.post('/create-reservation-payment', verifyToken, isCustomer, paymentController.createReservationPayment);
// router.post('/create-bill-payment', paymentController.createBillPayment); // Can be public for walk-in customers

// // VNPay callbacks (Public)
// router.get('/vnpay-return', paymentController.vnpayReturn);
// router.get('/vnpay-ipn', paymentController.vnpayIPN);

// // Query payment status (Protected)
// router.get('/status/:transactionId', verifyToken, paymentController.getPaymentStatus);

// // Payment history (Protected - Customer only)
// router.get('/history', verifyToken, isCustomer, paymentController.getPaymentHistory);

// module.exports = router;
