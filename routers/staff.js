const express = require('express');
const Router = express.Router();
const controllerStaff = require('../controllers/staff');
Router.post('/login', controllerStaff.postLogin);
Router.post('/post',controllerStaff.postImage);
module.exports = Router