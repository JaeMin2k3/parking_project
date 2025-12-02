const express = require('express');
const router  = express.Router();
const controllerAdmin = require('../controllers/admin')
const TokenVerify = require('../middleware/jwt')
const isAdmin = require('../middleware/isAdmin')
router.post('/login', controllerAdmin.postLogin);
router.post('/newStaff', isAdmin, controllerAdmin.postNewStaff)
router.get('/staffs', isAdmin, controllerAdmin.getAllStaffs);
router.get('/staff/:id',isAdmin, controllerAdmin.getStaff);
router.post('/edit/:idStaff',isAdmin, controllerAdmin.postEditStaff);
router.post('/delete/:idStaff',isAdmin, controllerAdmin.postDeleteStaff);

router.get('/slot-available',isAdmin,controllerAdmin.getSlotAvailable)
router.get('/auth/token',isAdmin, controllerAdmin.getRole);
router.get('/infor',isAdmin, controllerAdmin.getInfor);


router.get('/spots/area/:area', controllerAdmin.getAllSpotWithArea);
router.get('/spots/:spotId', controllerAdmin.getSpot);
router.get('/trash/deletedSpots', controllerAdmin.getDeletedSpots);
router.post('/restore/:spotId', controllerAdmin.postRestoreSpot);
router.post('/newSpots', controllerAdmin.postNewSpots);

module.exports = router;