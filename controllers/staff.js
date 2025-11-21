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
      jwt.sign({id: staff.username, role: staff.role}, process.env.SECRET_KEY, {expiresIn: "24h"},
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
    let dateTime = new Date().toLocaleString("sv-SE");
    const date = dateTime.split(" ")[0];
    const hour = dateTime.split(" ")[1];
    const tineEven = hour.split(":")[0];
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
    
    const reservation = await model.Reservation.findOne(
      {where: {
        plate: plate, 
        status: "CONFIRMED", 
        vehicleType: vehicleType,
        date: date,
        channel: 'ONLINE'
      }})
    const transaction = await sequelize.transaction();
    
    // nếu reservation tồn tại
    if(reservation){
      const booked_end = reservation.startBlock + reservation.blockCount;
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
      
      const ticket = await model.Ticket.create({
        date: date,
        reservationId: reservation.id,
        spotId: spotID,
        vehicleType: spot.vehicleType,
        bookedStart: reservation.startBlock,
        bookedEnd: booked_end,
        startTime: dateTime,
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
        date: date,
        status: "CHECKIN",
        ticketType: "off",
        startTime: dateTime ,
        spotId: spot.id,
        plate: plate,
        channel: 'OFFLINE'
      },{transaction})
      console.log(reservation);
      const uploadResult = await uploadAndCleanup(filePath)
      await model.Spot.update({isActive: false}, {where: {id: spot.id}, transaction})
      await model.Ticket.create({
        date:date,
        area: spot.area,
        position: spot.position,
        vehicleType: spot.vehicleType,
        startTime: dateTime,
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
  try {
    let dateTime = new Date().toLocaleString("sv-SE");
    const date = dateTime.split(" ")[0];
    const hour = dateTime.split(" ")[1];
    const tineEven = hour.split(":")[0];
    // tạo 1 phiên giao 
    const transaction = await sequelize.transaction();
    const filePath = req.file.path;
    const data = await platerecognizer(filePath);
    // lấy dữ liệu
    const type = data.results[0].vehicle.type;
    const plate = data.results[0].plate?.toUpperCase();
    if(!type || !plate) {
      transaction.rollback();
      return res.status(400).json({message: "không thể xác định được loại xe hoặc biển số vui lòng chụp lại"});
    }
    let vehicleType = 'CAR';
    if(type === "Motorcycle"){
      vehicleType = "MOTORBIKE";
    }
    // join 3 bảng ticket- reservation - payment để tính tiền
    const mapTicket = await model.Ticket.findOne({
      include: [
        {
          model: model.Reservation,
          attributes: ['channel', 'vehicleType'],
          where: {
            plate: plate,
            vehicleType: vehicleType,
            status: 'CHECKIN'
          }
        ,
        include: [
          {
            required: false,
            model: model.Payment,
            attributes: [
                'costParking', 'currency'
            ],
            where: {
              status: 'SUCCEEDED',
            }
          }
        ],
      }],transaction} );
    if(!mapTicket) {
      transaction.rollback();
      return res.status(404).json({message: "không tìm thấy phương tiện này"});
    }
    // đây ảnh lên cloud
    const uploadResult = await uploadAndCleanup(filePath);
    // lấy reservation và payment trong mapTicket
      const reservation = mapTicket.Reservation;
      const payment = reservation ? reservation.Payment : null;
      let totalPrice = 0;
      const parkingRate = await model.ParkingRate.findOne({where: {vehicleType:vehicleType }, transaction}) ;
      let payedMoney = 0;
      if(payment){
          payedMoney = payment.costParking;
          currency = payment.currency;
          if(reservation.channel === 'OFFLINE'){
          const start = mapTicket.startTime;
          const end = new Date(dateTime)
          const diffInMillis = end - start;
          // Đổi ra giờ 
          const hours = diffInMillis / (1000 * 60 * 60);
          totalPrice = hours*parkingRate.unitPrice - payedMoney;
          await model.Spot.update({isActive: true}, {where: {id: mapTicket.spotId}, transaction})
          }else{
          payedMoney = payment.costParking;
          const start = mapTicket.startTime;
          const end = new Date(dateTime)
          const diffInMillis = end - start;
          // Đổi ra giờ 
          const hours = diffInMillis / (1000 * 60 * 60);
          totalPrice = hours*parkingRate.unitPrice - payedMoney;
          if(totalPrice < 0) totalPrice = 0;
      }
      }else{
          const start = new Date(mapTicket.startTime);
          const end = new Date(dateTime)
          const diffInMillis = end - start;
          // Đổi ra giờ 
          const hours = diffInMillis / (1000 * 60 * 60);
          totalPrice = hours*parkingRate.unitPrice;
          await model.Spot.update({isActive: true}, {where: {id: mapTicket.spotId}, transaction});
      }
      const bill = await model.Bill.create({
        channel: mapTicket.channel,
        payedMoney: payedMoney,
        startTime: mapTicket.startTime,
        finishTime: dateTime,
        totalPrice: totalPrice,
        urlCloudinaryCheckIn: mapTicket.urlCloudinaryCheckIn,
        urlCloudinaryCheckOut: uploadResult.secure_url
      }, {transaction});
      if(!bill) {
        transaction.rollback();
        return res.status(500).json({message: "lỗi server không thể tạo bill"})      
      }
    // update ticket
      const updateTicket = await model.Ticket.update({
        finishTime: dateTime,
        status: 'inactive',
      },{
        where: {id: mapTicket.id}, transaction
      })
      if(!updateTicket) return res.json(500).json({message: "lỗi server không thể thực hiện cập nhật ticket"});
      //update reservation
      const updateReservation = await model.Reservation.update({
        status: 'CHECKOUT'
      },{
        where: {id: mapTicket.reservationId}
      })
      if(!updateReservation){
        transaction.rollback();
        return res.status(500).json({message: "lỗi server không thể update Reservartion"});
      }
      await transaction.commit();
      return res.status(200).json({
        message: "success",
        bill: bill,
      })
  } catch (error) {
    console.log(error);
    transaction.rollback();
    next(error);
  }
}

// /staff/infor
exports.getInfor = async (req,res,next) =>{
  try {
  const token = req.headers.authorization || req.headers.Authorization;
  let decode;
  try {
    decode = jwt.verify(token, process.env.SECRET_KEY);
  } catch (err) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
  const username = decode.id;
  const staff = await model.Staff.findByPk(username, {
    attributes: ['username', 'role'],
    raw: true,
  });

  if(!staff) return res.status(404).json({message: "user không tồn tại"});
  return res.status(200).json({
    message: "success",
    staff: staff
  })
  } catch (error) {
    console.log(error);
    return res.status(500).json({message: "lỗi server"});
  }
}