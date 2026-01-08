const express = require('express');
const router = express.Router();
const controllerUser = require('../controllers/user')
const validateUserNamePhone = require('../middleware/validateUsernamePhone')
const isUser = require('../middleware/isUser')
const jwt = require('../middleware/jwt')
router.post('/login', validateUserNamePhone, controllerUser.postLogin)
router.post('/signup', validateUserNamePhone, controllerUser.postSign)

router.post('/resend-verify', controllerUser.postResendVerify);
router.get('/verify-email/:token', controllerUser.verifyEmailBridge);
router.post('/verify-email', controllerUser.postVerifyEmail);

router.get('/infor', jwt, controllerUser.getInfor);

router.post('/send-barcode', controllerUser.postBarCode);
router.post('/forget-password', controllerUser.postForgetPw);

router.post('/parking-lot/available', isUser, controllerUser.postAvailableSlot)
router.post('/reservation', isUser, controllerUser.postReservation);
router.post('/payment/vnpay/create', isUser, controllerUser.postCreateVnpayPayment);
router.get('/payment/vnpay/return', controllerUser.vnpayReturn);


router.get('/parking/status', controllerUser.getAllSlotStatus);
router.get('/reservations/active/numbers',isUser, controllerUser.getActiveReservationNumbers);
router.get('/reservations',isUser, controllerUser.getReservations);


module.exports = router;

