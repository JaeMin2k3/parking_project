const express = require('express');
const Router = express.Router();
const controllerStaff = require('../controllers/staff');
const multer = require('multer');
const storge = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, 'upload')
  },
  filename: function(req, file, cb){
    cb(null, new Date().toISOString + '-' + file.filename);
  }
})


const upload = multer({storage: storge});
Router.post('/login', controllerStaff.postLogin);

Router.post('/ticket-entry',upload.single("image"), controllerStaff.postImageIn);
// Router.post('/free-endtry',upload.single("image"), controllerStaff.postImageOut)
module.exports = Router