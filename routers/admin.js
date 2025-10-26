const express = require('express');
const router  = express.Router();
const controllerAdmin = require('../controllers/admin')
const TokenVerify = require('../util/jwt')
const validateAdmin = require('../util/validateAdmin')
router.post('/login', controllerAdmin.postLogin);
router.post('/newStaff', validateAdmin, controllerAdmin.postNewStaff)
router.get('/staffs', validateAdmin, controllerAdmin.getAllStaffs);
router.post('/updateSpot',validateAdmin, controllerAdmin.postUpdateSpot);

router.get('/auth/token', controllerAdmin.getRole);
// router.get('/dashboard', controllerAdmin.getDashBoard );

module.exports = router;