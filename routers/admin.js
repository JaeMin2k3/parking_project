const express = require('express');
const router  = express.Router();
const controllerAdmin = require('../controllers/admin')

router.post('/login', controllerAdmin.postLogin);
router.post('/newStaff', controllerAdmin.postNewStaff)
router.get('/staffs', controllerAdmin.getAllStaffs);
// router.post('/staffs/:staffId', controllerAdmin.postDeleteStaff);

// router.get('/spots', controllerAdmin.getAllSpots );
// router.post('/newSpot/:spotId', controllerAdmin.postInactiveSpot);

router.post('/updateSpot', controllerAdmin.postUpdateSpot);

// router.get('/dashboard', controllerAdmin.getDashBoard );

module.exports = router;