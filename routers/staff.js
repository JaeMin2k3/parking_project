const express = require('express');
const Router = express.Router();
const controllerStaff = require('../controllers/staff');

const multer = require('multer');
const upload = multer({dest: "upload/"})

Router.post('/login', controllerStaff.postLogin);

Router.post('/ticket-entry',upload.single("image"), controllerStaff.postImageIn);
// Router.post('/free-endtry',upload.single("image"), controllerStaff.postImageOut)
module.exports = Router