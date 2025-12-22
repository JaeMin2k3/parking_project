const express = require('express');
const Router = express.Router();
const controllerStaff = require('../controllers/staff');
const isStaff = require('../middleware/isStaff')
const jwt = require('../middleware/jwt')
const multer = require('multer');
const storge = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, 'upload')
  },
  filename: function(req, file, cb){
   cb(null, Date.now() + '-' + file.originalname);
  }
})
const upload = multer({storage: storge});

Router.post('/login', controllerStaff.postLogin);
Router.get('/infor', jwt,controllerStaff.getInfor);
Router.post('/ticket-entry',isStaff,upload.single("image"), controllerStaff.postImageIn);
Router.post('/free-endtry',isStaff,upload.single("image"), controllerStaff.postImageOut);
module.exports = Router