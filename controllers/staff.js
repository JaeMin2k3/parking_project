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
const { channel } = require('diagnostics_channel');



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
    const plateTask = platerecognizer(filePath);
    const uploadTask = uploadAndCleanup(filePath);
    // console.log(data)
    // console.log(data.results[0].vehicle.type);
    // console.log(data.results[0].plate)
    // lấy dữ liệu do bên thứ 3 trả về
    const data = await plateTask;
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
    // check xem xe có trong bãi chưa
    const checkVehicle = await model.Ticket.findOne({where: {
      plate: plate,
      vehicleType: vehicleType,
      status: 'active'
    }, transaction});
    if(checkVehicle) {
      transaction.rollback();
      return res.status(404).json({message: "xe đã ở trong bãi"})
    }
    // console.log(checkVehicle);
    // nếu reservation tồn tại
    if(reservation){
      const booked_end = reservation.startBlock + reservation.blockCount;
      const check = await checkTime(reservation);
      if(!check) return res.status(404).json({message: `thời gian bạn đặt xe từ ${reservation.startBlock}h đến ${(reservation.startBlock+ reservation.blockCount)}h. Vui lòng chờ `})
      let spotID = reservation.spotId;
      let area = reservation.area;
      let position = reservation.position;
      const spot = await model.Spot.findOne({where: {id: spotID, status: 'active'}, transaction});
      // kiểm tra spot có hoạt động: xảy ra khi có lỗi với vị trí này admin cập nhập trạng thái của spot gây lỗi
      let newSpot = null;
      if(!spot){
        newSpot = await model.Spot.findOne({where: {
          vehicleType: vehicleType,
          slotType: 'OFFLINE',
          isActive: 1
        }, transaction})
        if(!newSpot) {
          await transaction.rollback();
          return res.status(404).json({message: "slot của bạn đã đặt đang bảo trì, tôi đã cố gắng tìm slot cho bạn nhưng không tìm được"});
        }
        // gắn lại giá trị new spot
        spotID = newSpot.id;
        area = newSpot.area;
        position = newSpot.position;
      }
      const uploadResult = await uploadTask;
      await model.Reservation.update(
        {status: 'CHECKIN'},
        {where: {id: reservation.id}, transaction}
      )
      // upadte trạng thái của spot vì spot thuộc loại offline nên phải update
      if(newSpot){
        await model.Spot.update({isActive: false}, {where: {id: newSpot.id}, transaction})
      }
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
        staffUsername: req.username
      }, {transaction})
      await transaction.commit(); 
      if(ticket){
        return res.status(200).json({
        area: area,
        position: position
      })
      }
      
    }else{
      // nếu chưa có reservation
      console.log("ko có reservation")
      // tìm kiếm spot đang trống
     const spot = await model.Spot.findOne({where: {
        isActive: 1,
        vehicleType: vehicleType,
        slotType: "OFFLINE"
      }, transaction});
      if(!spot) return res.status(400).json({message: "slot full"})
      // console.log(spot);
    // tạo reservation tạm
      const reservation = await model.Reservation.create( {
        date: date,
        status: "CHECKIN",
        ticketType: "off",
        startTime: dateTime ,
        spotId: spot.id,
        plate: plate,
        channel: 'OFFLINE',
        vehicleType: vehicleType,
      },{transaction})
      // console.log(reservation);
      // đẩy ảnh lên cloudinary
      const uploadResult = await uploadTask;
      // cập nhập lại trạng thái của spot
      await model.Spot.update({isActive: false}, {where: {id: spot.id}, transaction})
      // tạo ticket
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
        reservationId: reservation.id,
        staffUsername: req.username
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
  // tạo 1 phiên giao 
  const transaction = await sequelize.transaction();
  try {
    let dateTime = new Date().toLocaleString("sv-SE");
    const date = dateTime.split(" ")[0];
    const hour = dateTime.split(" ")[1];
    const tineEven = hour.split(":")[0];
    
    const filePath = req.file.path;
    const plateTask = platerecognizer(filePath);
    const uploadTask = uploadAndCleanup(filePath);
    // lấy dữ liệu
    const data = await plateTask;
    const type = data.results[0].vehicle.type;
    const plate = data.results[0].plate?.toUpperCase();
    console.log(type + " "+ plate)
    if(!type || !plate) {
      transaction.rollback();
      return res.status(400).json({message: "không thể xác định được loại xe hoặc biển số vui lòng chụp lại"});
    }
    let vehicleType = 'CAR';
    if(type === "Motorcycle"){
      vehicleType = "MOTORBIKE";
    }
    console.log(vehicleType);
    const ticket = await model.Ticket.findOne({where: {
      plate: plate,
      vehicleType: vehicleType
    }, transaction});
    
    const payment = await model.Payment.findOne({
        where: {
          reservationId: ticket.reservationId,
          status: 'SUCCEEDED',
        }
      }, transaction);
      const spot = await model.Spot.findOne({where: {
        id: ticket.spotId,
      }})
      console.log(spot)
    if(!ticket){
      await transaction.rollback();
      return res.status(404).json({message: "xe này không tồn tại"})
    }
    // lấy reservation và payment trong mapTicket
      let totalPrice = 0;
      const parkingRate = await model.ParkingRate.findOne({where: {vehicleType:vehicleType }, transaction}) ;
      let payedMoney = 0;
      const start = new Date(ticket.startTime);
      const end = new Date(dateTime)
      const diffInMillis = end - start;
      const hours = diffInMillis / (1000 * 60 * 60);
      if(payment){
          payedMoney = payment.costParking;
          currency = payment.currency;
          // trường hop nay xay ra khi ghe dat online bị loi he thong chuyen sang offline cho khach
          if(spot.slotType === 'OFFLINE'){
          totalPrice = hours*parkingRate.unitPrice - payedMoney;
          await model.Spot.update({isActive: true}, {where: {id: ticket.spotId}, transaction})
          }else{
            // th nay là chỗ đỗ xe cho online nên không cần update spot
          payedMoney = payment.costParking;
          totalPrice = hours*parkingRate.unitPrice - payedMoney;
          if(totalPrice < 0) totalPrice = 0;
      }
      }else{
          totalPrice = hours*parkingRate.unitPrice;
          await model.Spot.update({isActive: true}, {where: {id: ticket.spotId}, transaction});
      }
      const uploadResult = await uploadTask;
      const bill = await model.Bill.create({
        channel: spot.slotType,
        payedMoney: payedMoney,
        startTime: start,
        finishTime: end,
        totalPrice: totalPrice,
        urlCloudinaryCheckIn: ticket.urlCloudinaryCheckIn,
        urlCloudinaryCheckOut: uploadResult.secure_url,
      }, {transaction});
      if(!bill) {
        transaction.rollback();
        return res.status(500).json({message: "lỗi server không thể tạo bill"})      
      }

      await Promise.all([
        await model.Ticket.update({finishTime: dateTime,status: 'inactive',},
        {where: {id: ticket.id}, transaction}),
        await model.Reservation.update({status: 'CHECKOUT'},
        {where: {id: ticket.reservationId}})
      ])
      await transaction.commit();
      const billResponse = bill.toJSON();
      billResponse.startTime = new Date(bill.startTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      billResponse.finishTime = new Date(bill.finishTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
       return res.status(200).json({
        message: "success",
        bill: billResponse, 
      });
  } catch (error) {
    console.log(error);
    transaction.rollback();
    next(error);
  }
}

// /staff/infor
exports.getInfor = async (req,res,next) =>{
  console.log(req.username)
  const staff = await model.Staff.findByPk(
    req.username,{attributes: ['username', 'name', 'date', 'role']}
  );

  if(!staff) return res.status(404).json({message: "user không tồn tại"});
  return res.status(200).json({
    message: "success",
    staff: staff
  })
}