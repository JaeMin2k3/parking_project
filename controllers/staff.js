const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Reservation = require('../models/Reservation');
const { now } = require('sequelize/lib/utils');
const Staff = require('../models/Staff')
require('dotenv').config();
const sequelize = require('../util/database')
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
      jwt.sign({_id: staff.username}, process.env.SECRET_KEY, {expiresIn: "24h"},
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

// staff/createTicket
exports.postCreateTicket = async(req, res, next) => {
  const token = req.headers.authorization || req.headers.Authorization;
  console.log(token);
  const decoded = jwt.verify(token, process.env.SECRET_KEY);
  const {area, position, plate} = req.body;
  const staff = await model.Staff.findOne({where: {username: decoded._id}})
  const spot = await model.Spot.findOne({where: {area, position}});
  const ticket = staff.createTicket({
    spot_id: spot.id,
    plate: plate,
    vehicle_type: spot.type,
    start_time: now(),
    status: true
  });
  if(ticket) res.status(200).json({
    message: "success"
  })
  else{Ơ
    res.status(500).json({
      message: "lỗi không thể tạo được ticket"
    })
  }
}

// staff/bill
exports.postCreateBill = async (req, res, next) => {
  const transaction = await sequelize.transaction(); 
  try{
  const idTicket = req.body.id;
  const ticket = await model.Ticket.findOne({where: {id: idTicket}});
  const token = req.headers.authorization || req.headers.Authorization;
  console.log(token);
  if(!token) return res.status(401).json({message: "no token"})
  const decoded = await jwt.verify(token, process.env.SECRET_KEY);
  console.log(decoded);
  if (!decoded) return res.stautus(401).json({message: "token không hợp lệ"});
  const staff = await model.Staff.findOne({where: {username: decoded._id}});
  if(!staff) return res.status(404).json({message: "nhân viên không tồn tại"})
  
  const start = new Date(ticket.start_time);
  const end = new Date(); 
  const diffMs = end - start; 
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const rate = await model.ParkingFee.findOne({ where: { vehicle_type: ticket.vehicle_type } });
  const totalPrice = rate.unit_price * diffHours;

  let payed_money = 0;
  console.log(payed_money);
  if(ticket.status){
  const bill = await ticket.createBill({
    payed_money: payed_money,
    totalPrice: totalPrice
  },{transaction: transaction});
  // cập nhập lại trạng thái ticket
  await ticket.update({ status: 0 }, { transaction });

  await transaction.commit(); 

  if(bill) return res.status(200).json({message:"success"});
  else console.log("không thể tạo bill")
  }else {
    res.status(409).json({
      message: "bill đã được tạo"
    })
  }
}catch(err){
  console.log(err);
  throw(err);
}
  
}