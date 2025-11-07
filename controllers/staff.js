const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Reservation = require('../models/Reservation');
const Spot = require('../models/Spot')
const Staff = require('../models/Staff')
const Ticket = require('../models/Ticket')
require('dotenv').config();
const sequelize = require('../config/database')
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

const platerecognizer = require('../util/plateRecognizer');
exports.postImage = async(req, res, next) => {
  try{
    const filePath = req.file.path; // do multer đã gắn thông tin của file chứa ảnh vào req.file, ở trong router
    const data = await platerecognizer(filePath);
    console.log(data)
    console.log(data.results[0].vehicle.type);
    console.log(data.results[0].plate)
    const type = data.results[0].vehicle.type;
    let vehicleType = "CAR"; 

    if (type === "UNKNOWN") {
      return res.status(400).json({ message: "Không thể xác định loại xe, vui lòng chụp lại" });
    } else if (type === "MOTORBIKE") {
      vehicleType = "MOTORBIKE";
    } else {
    vehicleType = "CAR";
    }
    const plate = data.results[0].plate;
    const reservation = await Reservation.findOne({where: {plate: plate, status: "CONFIRMED", ticketType: vehicleType}})
    const transaction = await sequelize.transaction();
    if(reservation){
      const spotID = reservation.spotId;
      const spot = await Spot.findOne({where: {id: spotID}}, {transaction});
      const ticket = await Ticket.create({
        spotId: spotID,
        vehicleType: spot.type,
        bookedStart: reservation.booked_start,
        bookedStart: reservation.booked_end,
        startTime: Date.now(),
        status: 'active'
      }, {transaction})
      if(ticket){
        res.status(200).json({
        area: spot.area,
        position: spot.position
      })
      }
    }else{
     const spot = await Spot.findOne({where: {
        isActive: 1,
        vehicleType: vehicleType,
        slotType: "OFFLINE"
      }}, {transaction});
      await Reservation.create({where: {
        date: Date.now,
        status: "active",
        ticketType: "off",
        startTime: Date.now(),
        spotId: spot.id
      }},{transaction})
      await Ticket.create({where: {
        area: spot.area,
        position: spot.position,
        vehicleType: spot.vehicleType,
        startTime: Date.now(),
        status: "active",
        spot_Id: spot.id
      }}, {transaction})

      res.status(200).json({
        area: spot.area,
        position: spot.position
      })
    } 
  }catch(err) {
    throw(err);
  }
}