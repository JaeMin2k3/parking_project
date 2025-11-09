const express = require('express');
const router = express.Router();
const controllerUser = require('../controllers/user')
const validateUserNamePhone = require('../middleware/validateUsernamePhone')
const TokenVerify = require('../middleware/jwt')

router.post('/login', validateUserNamePhone, controllerUser.postLogin)
router.post('/signup', validateUserNamePhone, controllerUser.postSign)
router.post('/resend-verify', controllerUser.postResendVerify);
// router.post('/available-spots', TokenVerify, controllerUser.getAvailableSpots)
router.get('/verify-email/:token', controllerUser.verifyEmailBridge);

// API xử lý verify (POST)
router.post('/verify-email', controllerUser.postVerifyEmail);
module.exports = router;