const express = require('express');
const router  = express.Router();
const controllerAdmin = require('../controllers/admin')
const isAdmin = require('../middleware/isAdmin')
router.post('/newStaff', isAdmin, controllerAdmin.postNewStaff)
router.get('/staffs', isAdmin, controllerAdmin.getAllStaffs);
router.get('/staff/:id',isAdmin, controllerAdmin.getStaff);
router.post('/editStaff/:idStaff',isAdmin, controllerAdmin.postEditStaff);
router.post('/deleteStaff/:idStaff',isAdmin, controllerAdmin.postDeleteStaff);
router.post('/restoreStaff/:idStaff',isAdmin, controllerAdmin.postRestoreStaff);
router.get('/trash/deletedStaffs', isAdmin,controllerAdmin.getDeletedStaffs);
router.get('/infor',isAdmin, controllerAdmin.getInfor);


router.get('/spots/area/:area', isAdmin,controllerAdmin.getAllSpotWithArea);
router.get('/spots/:spotId', isAdmin,controllerAdmin.getSpot);
router.get('/trash/deletedSpots', isAdmin,controllerAdmin.getDeletedSpots);
router.post('/restoreSpot/:spotId', isAdmin,controllerAdmin.postRestoreSpot);
router.post('/newSpots', isAdmin,controllerAdmin.postNewSpots);
router.post('/deleteSpot/:idSpot',isAdmin, controllerAdmin.postDeleteSpot)
router.post('/editSpot/:idSpot', isAdmin, controllerAdmin.postEditSpot)

router.get('/auth/token',isAdmin, controllerAdmin.getRole);
router.get('/slot-available',isAdmin,controllerAdmin.getSlotAvailable);
router.post('/allTickets', isAdmin, controllerAdmin.postAllTickets)
router.post('/nowReservation', isAdmin, controllerAdmin.postReservation)
router.post('/nowRevenue', isAdmin, controllerAdmin.getNowRevenue);
router.get('/MonthlyRevenue',isAdmin, controllerAdmin.getMonthlyRevenue);
router.get('/vehicleRatio', isAdmin,controllerAdmin.getVehicleRatio);
router.post('/newParkingRateType',isAdmin, controllerAdmin.postNewParkingRateType);
router.get('/ParkingRate', isAdmin,controllerAdmin.getParkingRate);

router.post('/traffic-flow', isAdmin,controllerAdmin.postTrafficFlow)


module.exports = router;