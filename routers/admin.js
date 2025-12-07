const express = require('express');
const router  = express.Router();
const controllerAdmin = require('../controllers/admin')
const isAdmin = require('../middleware/isAdmin')
router.post('/login', controllerAdmin.postLogin);
router.post('/newStaff', isAdmin, controllerAdmin.postNewStaff)
router.get('/staffs', isAdmin, controllerAdmin.getAllStaffs);
router.get('/staff/:id',isAdmin, controllerAdmin.getStaff);
router.post('/edit/:idStaff',isAdmin, controllerAdmin.postEditStaff);
router.post('/delete/:idStaff',isAdmin, controllerAdmin.postDeleteStaff);
router.post('/restore/:idStaff',isAdmin, controllerAdmin.postRestoreStaff);
router.get('/trash/deletedStaffs', isAdmin,controllerAdmin.getDeletedStaffs);
router.get('/infor',isAdmin, controllerAdmin.getInfor);


router.get('/spots/area/:area', isAdmin,controllerAdmin.getAllSpotWithArea);
router.get('/spots/:spotId', isAdmin,controllerAdmin.getSpot);
router.get('/trash/deletedSpots', isAdmin,controllerAdmin.getDeletedSpots);
router.post('/restore/:spotId', isAdmin,controllerAdmin.postRestoreSpot);
router.post('/newSpots', isAdmin,controllerAdmin.postNewSpots);
router.post('/delete/:idSpot',isAdmin, controllerAdmin.postDeleteSpot)

router.get('/auth/token',isAdmin, controllerAdmin.getRole);
router.get('/slot-available',isAdmin,controllerAdmin.getSlotAvailable);
router.get('/allTickets', controllerAdmin.getAllTickets)
// Report & Charts Routes
router.get('/report/monthly-revenue', isAdmin, controllerAdmin.getMonthlyRevenue);
router.get('/report/monthly-vehicles', isAdmin, controllerAdmin.getMonthlyVehicles);
router.get('/report/vehicle-ratio', isAdmin, controllerAdmin.getVehicleRatio);

module.exports = router;