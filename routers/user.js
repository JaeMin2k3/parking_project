const express = require('express');
const router = express.Router();
const controllerUser = require('../controllers/user')
const validateUserNamePhone = require('../middleware/validateUsernamePhone')
const TokenVerify = require('../middleware/jwt')
const isUser = require('../middleware/isUser')

router.post('/login', validateUserNamePhone, controllerUser.postLogin)
router.post('/signup', validateUserNamePhone, controllerUser.postSign)

router.post('/resend-verify', isUser, controllerUser.postResendVerify);
router.get('/verify-email/:token', controllerUser.verifyEmailBridge);
router.post('/verify-email', controllerUser.postVerifyEmail);

router.get('/infor', isUser, controllerUser.getInfor);

router.post('/send-barcode', controllerUser.postBarCode);
router.post('/forget-password', controllerUser.postForgetPw);

router.post('/parking-lot/available', controllerUser.postAvailableSlot)
router.post('/reservation', isUser, controllerUser.postReservation);
router.post('/payment/vnpay/create', isUser, controllerUser.postCreateVnpayPayment);
router.get('/payment/vnpay/return', controllerUser.vnpayIpn)
module.exports = router;