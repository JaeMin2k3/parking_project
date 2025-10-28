const express = require('express');
const router = express.Router();
const controllerUser = require('../controllers/user')
const validateUserNamePhone = require('../util/validateUsernamePhone')
const TokenVerify = require('../util/jwt')

router.post('/login', validateUserNamePhone, controllerUser.postLogin)
router.post('/signup', validateUserNamePhone, controllerUser.postSign)
router.post('/available-spots', TokenVerify, controllerUser.getAvailableSpots)

module.exports = router;