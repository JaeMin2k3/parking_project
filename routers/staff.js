const express = require('express');
const Router = express.Router();
const controllerStaff = require('../controllers/staff');
Router.post('/login', controllerStaff.postLogin);
Router.post('/createTicket', controllerStaff.postCreateTicket)
Router.post('/createBill', controllerStaff.postCreateBill)
module.exports = Router