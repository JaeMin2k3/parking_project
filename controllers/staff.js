const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Reservation = require('../models/Reservation');
const Spot = require('../models/Spot')
const Staff = require('../models/Staff')
const Ticket = require('../models/Ticket')
require('dotenv').config();
const platerecognizer = require('../helper/plateRecognizer');
const cloudinary = require('../config/cloudinary')
const checkTime = require('../helper/checkTime')
const fs = require('fs')
const sequelize = require('../config/database');
const converTime = require('../helper/converTime');



// staff/login
exports.postLogin = async (req,res,next) => {
  const {username, password} = req.body;
  console.log(username, password)
  const staff = await model.Staff.findOne({
    where: { username, role: "staff" },
    attribute: ["username", "password_hash", "role"],
    raw: true
  });
  console.log(staff)
  if(staff){
    const oke = await bcrypt.compare(password, staff.password_hash);
    console.log(oke)
    if(oke){
      jwt.sign({_id: staff.username, role: staff.role}, process.env.SECRET_KEY, {expiresIn: "24h"},
      (err,token) => {
        if(err){
          console.log(err);
          res.status(500).send(err);
        }else{
          res.status(200).json({
            message: "success",
            token: token,
            role: staff.role
          })
        }
      })
    }else{
      res.status(401).json({
        message: "fail password"
      })
    }
  }else{
    res.status(401).json({
      message: "Tài khoản mật khẩu không tồn tại"
    })
  }
}

// /staff/ticket-entry
exports.postImage = async(req, res, next) => {
  try{
    const filePath = req.file.path; // do multer đã gắn thông tin của file chứa ảnh vào req.file, ở trong router
    const data = await platerecognizer(filePath);
    console.log(data)
    console.log(data.results[0].vehicle.type);
    console.log(data.results[0].plate)
    // lấy dữ liệu do bên thứ 3 trả về
    const type = data.results[0].vehicle.type;
    const plate = data.results[0].plate;
    // check biển số
    if(!plate) return res.status(400).json({
      message: "Không thể xác định được biển số vui lòng chụp lại"
    })
    // xử lý loại xe
    let vehicleType = "CAR"; 
    if (type === "UNKNOWN") {
      return res.status(400).json({ message: "Không thể xác định loại xe, vui lòng chụp lại" });
    } else if (type === "MOTORBIKE") {
      vehicleType = "MOTORBIKE";
    } else {
    vehicleType = "CAR";
    }
    const date = new Date().toISOString();
    const date1 = date.split('T')[0]
    const reservation = await model.Reservation.findOne(
      {where: {
        plate: plate, 
        status: "CONFIRMED", 
        vehicleType: vehicleType,
        date: date1
      }})
    const transaction = await sequelize.transaction();
    // chưa xử lí reservation đã checkin
    if(reservation){
      await checkTime(reservation, res);
      const spotID = reservation.spotId;
      const spot = await model.Spot.findOne({where: {id: spotID}, transaction});
      const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'parking'
      });
      console.log(uploadResult);
      try {
        fs.unlinkSync(filePath);
        console.log('Đã xóa file local:', filePath);
      } catch (err) {
        console.error('Không thể xóa file local:', err);
      }
      const ticket = await model.Ticket.create({
        reservationId: reservation.id,
        spotId: spotID,
        vehicleType: spot.type,
        bookedStart: reservation.booked_start,
        bookedEnd: reservation.booked_end,
        startTime: converTime(),
        status: 'active',
        urlCloudinaryCheckIn: uploadResult.secure_url,
        plate: plate,
      }, {transaction})
      if(ticket){
        res.status(200).json({
        area: spot.area,
        position: spot.position
      })
      }
    }else{
     const spot = await model.Spot.findOne({where: {
        isActive: 1,
        vehicleType: vehicleType,
        slotType: "OFFLINE"
      }, transaction});
      console.log(spot);
      const reservation = await model.Reservation.create( {
        date: new Date(),
        status: "CONFIRMED",
        ticketType: "off",
        startTime: new Date(),
        spotId: spot.id,
        plate: plate,
        channel: 'OFFLINE'
      },{transaction})
      console.log(reservation);
      const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: 'parking'
      });
      console.log(uploadResult);
      try {
        fs.unlinkSync(filePath);
        console.log('Đã xóa file local:', filePath);
      } catch (err) {
        console.error('Không thể xóa file local:', err);
      }
      await model.Ticket.create({
        date:date1,
        area: spot.area,
        position: spot.position,
        vehicleType: spot.vehicleType,
        startTime: new Date(),
        status: "active",
        spotId: spot.id,
        urlCloudinaryCheckIn: uploadResult.secure_url,
        plate: plate
      }, {transaction})
      res.status(200).json({
        area: spot.area,
        position: spot.position
      })
    }
    await transaction.commit(); 
  }catch(err) {
    console.log(err);
    next(err);
  }
}