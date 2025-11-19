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
const uploadAndCleanup = require('../helper/uploadAndCleanup');



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
exports.postImageIn = async(req, res, next) => {
  try{
    const filePath = req.file.path; // do multer đã gắn thông tin của file chứa ảnh vào req.file, ở trong router
    const data = await platerecognizer(filePath);
    console.log(data)
    console.log(data.results[0].vehicle.type);
    console.log(data.results[0].plate)
    // lấy dữ liệu do bên thứ 3 trả về
    const type = data.results[0].vehicle.type;
    const plate = data.results[0].plate?.toUpperCase();
    // check biển số
    if(!plate) return res.status(400).json({
      message: "Không thể xác định được biển số vui lòng chụp lại"
    })
    // xử lý loại xe
    let vehicleType = "CAR"; 
    if (type === "UNKNOWN") {
      return res.status(400).json({ message: "Không thể xác định loại xe, vui lòng chụp lại" });
    } else if (type === "Motorcycle") {
      vehicleType = "MOTORBIKE";
    } else {
    vehicleType = "CAR";
    }
    const now = new Date();
  //Dùng locale của Thụy Điển (sv-SE) để lấy format YYYY-MM-DD tại vì javascript không giống với java hay python có thể format YYYY-MM-DD 
    const currentDate = now.toLocaleDateString('sv-SE');
    const reservation = await model.Reservation.findOne(
      {where: {
        plate: plate, 
        status: "CONFIRMED", 
        vehicleType: vehicleType,
        date: currentDate,
        channel: 'ONLINE'
      }})
    const transaction = await sequelize.transaction();
    // nếu reservation tồn tại
    if(reservation){
      const check = await checkTime(reservation);
      if(!check) return res.status(404).json({message: `thời gian bạn đặt xe từ ${reservation.startBlock}h đến ${(reservation.startBlock+ reservation.blockCount)}h. Vui lòng chờ `})
      const spotID = reservation.spotId;
      const spot = await model.Spot.findOne({where: {id: spotID}, transaction});
      const uploadResult = await uploadAndCleanup(filePath)
      await model.Reservation.update(
        {status: 'CHECKIN'},
        {
        where: {id: reservation.id}, transaction
        }
      )
      const now = new Date().toLocaleDateString('sv-SE');
      const booked_end = reservation.startBlock + reservation.blockCount;
      const ticket = await model.Ticket.create({
        date: now,
        reservationId: reservation.id,
        spotId: spotID,
        vehicleType: spot.vehicleType,
        bookedStart: reservation.startBlock,
        bookedEnd: booked_end,
        startTime: new Date(),
        status: 'active',
        urlCloudinaryCheckIn: uploadResult.secure_url,
        plate: plate,
      }, {transaction})
      await transaction.commit(); 
      if(ticket){
        res.status(200).json({
        area: spot.area,
        position: spot.position
      })
      }
      // nếu chưa có reservation
    }else{
      console.log("ko có reservation")
     const spot = await model.Spot.findOne({where: {
        isActive: 1,
        vehicleType: vehicleType,
        slotType: "OFFLINE"
      }, transaction});
      if(!spot) return res.status(400).json({message: "slot full"})
      console.log(spot);
      const reservation = await model.Reservation.create( {
        date: new Date(),
        status: "CHECKIN",
        ticketType: "off",
        startTime: currentDate ,
        spotId: spot.id,
        plate: plate,
        channel: 'OFFLINE'
      },{transaction})
      console.log(reservation);
      const uploadResult = await uploadAndCleanup(filePath)
      await model.Spot.update({isActive: false}, {where: {id: spot.id}, transaction})
      await model.Ticket.create({
        date:currentDate,
        area: spot.area,
        position: spot.position,
        vehicleType: spot.vehicleType,
        startTime: new Date(),
        status: "active",
        spotId: spot.id,
        urlCloudinaryCheckIn: uploadResult.secure_url,
        plate: plate,
        reservationId: reservation.id
      }, {transaction})
      await transaction.commit(); 
      res.status(200).json({
        area: spot.area,
        position: spot.position
      })
    }
    
  }catch(err) {
    console.log(err);
    next(err);
  }
}

// /staff/free-entry

exports.postImageOut = async(req,res,next) => {
  
}