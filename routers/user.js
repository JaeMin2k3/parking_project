const express = require('express');
const router = express.Router();
const controllerUser = require('../controllers/user')
const validateUserNamePhone = require('../middleware/validateUsernamePhone')
const TokenVerify = require('../middleware/jwt')

router.post('/login', validateUserNamePhone, controllerUser.postLogin)
router.post('/signup', validateUserNamePhone, controllerUser.postSign)

router.post('/resend-verify', controllerUser.postResendVerify);
router.get('/verify-email/:token', controllerUser.verifyEmailBridge);
router.post('/verify-email', controllerUser.postVerifyEmail);

router.get('/infor', controllerUser.getInfor);

router.post('/send-barcode', controllerUser.postBarCode);
router.post('/forget-password', controllerUser.postForgetPw);
module.exports = router;