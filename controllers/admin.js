const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TokenVerify = require('../util/jwt')
require('dotenv').config();
// admin/login
exports.postLogin = async(req, res, next) => {
  const {username, password} = req.body;  
  const admin = await model.Staff.findOne({
    where: {username},
    attribute: ["username", "password_hash", "role"],
    raw: true
  })

  if(admin){ 
    console.log(admin);
    const oke =  await bcrypt.compare(password, admin.password_hash);
    if(oke){
      jwt.sign({_id: admin.username,  role: admin.role}, process.env.SECRET_KEY, {expiresIn: "24h"},
        (err, token) => {
          if(err){
            console.log(err);
            res.status(500).send(err);
          }else{
            res.status(200).json({
              message: "success",
              token: token,
              role: admin.role
            })
          }
        }
      );
    }else {
      res.status(401).json({
        message: "fail pw"
      })
    }
  } else res.status(401).json(
    {
      message: "tài khoản không tồn tại"
    }
  )
}

//admin/staffs
exports.getAllStaffs = async (req,res, next) => {
  const staffs = await model.Staff.findAll({
    where: {
      role: "staff"
    },
    attribute: ["username", "password"],
    raw: true
  });

  if(staffs){
    res.status(200).json({
      message: "success",
      staffs: staffs
    })
  }else{
    res.status(404).json({
      message: "không có tài khoản nhân viên nào"
    })
  }
}

// admin/newStaff
exports.postNewStaff = async (req,res,next) => {
  const {username, password} = req.body;
  console.log(username + "+" + password);
  const pw_hash = await bcrypt.hashSync(password, 10);
  console.log(pw_hash)
  await model.Staff.create({
    username: username,
    password_hash: pw_hash,
    role: 'staff',
    status: 1
  })
  res.status(200).json({
    message: 'success'
  })
} 

// admin/updateSpot
exports.postUpdateSpot = async (req,res,next) => {
  const {username, password, status} = req.body;
  console.log(username + " " + password + " "+status)
  const pw_hash = bcrypt.hashSync(password, 10);
  console.log(pw_hash);
  const check = await model.Staff.update(
    {
      password_hash: pw_hash,
      status: status
    },
    {
      where: {username},
    }
  )
  console.log(check)
  if(check) res.status(200).json({
    message: "cập nhật thành công"
  })
  else{
    res.status(500).json({
      message: "cập nhật thất bại, vui lòng thử lại sau"
    })
  }
  }
