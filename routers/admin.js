const express = require('express');
const router  = express.Router();
const controllerAdmin = require('../controllers/admin')
const TokenVerify = require('../middleware/jwt')
const validateAdmin = require('../middleware/validateAdmin')
router.post('/login', controllerAdmin.postLogin);
router.post('/newStaff', validateAdmin, controllerAdmin.postNewStaff)
router.get('/staffs', validateAdmin, controllerAdmin.getAllStaffs);

router.get('/staff/:id',validateAdmin, controllerAdmin.getStaff);
router.post('/edit/:idStaff',validateAdmin, controllerAdmin.postEditStaff);
router.post('/delete/:idStaff',validateAdmin, controllerAdmin.postDeleteStaff);
router.get('/slot-available',controllerAdmin.getSlotAvailable)
router.get('/auth/token', controllerAdmin.getRole);
router.get('/infor', controllerAdmin.getInfor);
module.exports = router;