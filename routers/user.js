const express = require('express');
const router = express.Router();
const controllerUser = require('../controllers/user')
router.post('/login', controllerUser.postLogin)
router.post('/signup', controllerUser.postSign)

module.exports = router;