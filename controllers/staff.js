const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const platerecognizer = require('../helper/plateRecognizer');
const io = require('../socket');
const sequelize = require('../config/database');
const uploadAndCleanup = require('../helper/uploadAndCleanup');

const {Op} = require('sequelize');
const moment = require("moment-timezone")
const findReplaceTime = require('../helper/findReplaceTime')
const findAvailableSpotOnlie = require('../helper/findAvailableSpotOnline')
const findPaymentNoSHow = require('../helper/findPaymentNoSHow');


// staff/login
exports.postLogin = async (req,res,next) => {
  const {username, password} = req.body;
  console.log(username, password)
  const staff = await model.Staff.findOne({
    where: { username },
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
exports.postImageIn = async (req, res, next) => {
   // nhận dữ liệu từ req
    const filePath = req.file.path; 
    // khởi tạo trc
    const plateTask = platerecognizer(filePath); 
    const uploadTask = uploadAndCleanup(filePath).catch(err => {
            console.error("Lỗi upload ngầm (đã chặn crash):", err.message);
            return null; 
        });

    let transaction = await sequelize.transaction();

    try {
        //  lấy thời gian hiện tại
         const now =  moment().tz("Asia/Ho_Chi_Minh").format('YYYY-MM-DD HH:mm:ss');

        // Đợi kết quả nhận diện biển số 
        const data = await plateTask;
        const typeRaw = data.results[0]?.vehicle?.type;
        const plate = data.results[0]?.plate?.toUpperCase();
        console.log("typeRaw" + typeRaw)
        // Validate biển số
        if (!plate) {
            return res.status(400).json({ 
                message: "Không thể xác định được biển số, vui lòng chụp lại" 
            });
        }

        // Validate loại xe
        let vehicleType = "CAR";
        if (typeRaw === "Motorcycle") {
            vehicleType = "MOTORBIKE";
        } else if (typeRaw === "UNKNOWN") {
            return res.status(400).json({ message: "Không thể xác định loại xe" });
        }

        
        

        // Kiểm tra xem xe đã có trong bãi chưa 
        const checkVehicle = await model.Ticket.findOne({
            where: {
                plate: plate,
                vehicleType: vehicleType,
                status: 'active'
            }, 
            transaction
        });

        if (checkVehicle) {
            await transaction.rollback();
            return res.status(400).json({ message: "Xe đang ở trong bãi" });
        }

        console.log(plate);
        console.log(vehicleType);
        // đẩy ảnh lên cloud
        

        // Tìm Reservation hợp lệ
        const reservations = await model.Reservation.findAll({
            where: {
                plate: plate,
                status: "CONFIRMED",
                vehicleType: vehicleType,
                channel: 'ONLINE',
                dateOut: {
                  [Op.gt]: now
                }
                
            },
            raw: true,
            order: [['dateIn', 'ASC']],
            limit: 2,
            transaction
        });
        console.log("reservation" + reservations)
        let spotId = null;
        let area = null;
        let position = null;
        let ticketReservationId = null;
        let reservation = null;
        let offTransfer = true;
        //  CÓ ĐẶT TRƯỚC (ONLINE) 
        if (reservations.length > 0){offTransfer = false}
        console.log(reservations.length)
          
          
        if(!offTransfer){
          
            console.log("có reservation");
            const nowObj = moment(now); 
            for(let i = 0 ; i < reservations.length ; i ++){
            const dateInObj = moment(reservations[i].dateIn);
            const dateOutMoment = moment(reservations[i].dateOut);
            const diffMinutes = dateInObj.diff(nowObj, 'minutes'); // khoảng giữa thời gian checkIn và hiện tại
            const minutesLeft = dateOutMoment.diff(nowObj, 'minutes'); // thời gian đỗ còn lại
            // reservation hết thời gian
            if(minutesLeft < 10 && i === reservations.length -1 && diffMinutes > 0){
              offTransfer = true;
              break;
            }
            // th mà thời gian còn lại < 10 mà mảng chưa đến phần tử cuối cùng duyệt tiếp
            else if (minutesLeft < 10 && i < reservations.length - 1 && diffMinutes > 0) continue;
            // thời gian còn lại > 10 cho check in
            else if(minutesLeft > 10 && i <= reservations.length -1) {
              reservation = reservations[i];
              spotId = reservation.spotId
              break;
            }
            // trường hợp vào sớm 5 phút 
            else if( minutesLeft > 10 && diffMinutes < 5) {reservation = reservations[i]; spotId = reservation.spotId; break;}
            // trường hợp vào sớm trong khoảng 5 - 60 phút bảo -> chưa đến giờ vào
            else if( minutesLeft > 10 && 60 >= diffMinutes  && diffMinutes > 5) {
              await transaction.rollback();
              console.log(diffMinutes1);
                    return res.status(400).json({ 
                        message: `Bạn đến sớm ${diffMinutes} phút. Giờ đặt chỗ của bạn là: ${dateInObj.format('HH:mm')}` 
                    });
              }
              // trường hợp này là đến sớm quá 60 phút cho vào khách vãng lai
            else if( minutesLeft > 10 &&   diffMinutes > 60) { offTransfer = true; break;
             }
            }
          }
           console.log(reservation)
          // kiểm tra
          if(!offTransfer){
            if(reservation.isOverNight){
              bookedEnd = (reservation.startBlock + reservation.blockCount) % 24
            }else bookedEnd = reservation.startBlock + reservation.blockCount;            

            // Kiểm tra Spot có khả dụng không 
            const spot = await model.Spot.findOne({
                where: { 
                  id: spotId,
                  status: true,
                  isActive: true 
                }, 
                lock: transaction.LOCK.UPDATE,
                paranoid: true,
                transaction
            });
            // Nếu Spot lỗi/bảo trì -> Tìm Spot thay thế
            if (!spot ) {
              console.log("spot không khả thi")
                // tìm slot online thay thế
                let newSpot = await findReplaceTime(reservation, transaction);
                
                // Nếu không tìm được slot thay thế đúng chuẩn -> Tìm đại 1 slot Offline trống
                if (!newSpot) {
                    newSpot = await model.Spot.findOne({
                        where: {
                            status: true,
                            isActive: true,
                            vehicleType: vehicleType,
                            slotType: 'OFFLINE',
                        }, 
                        transaction
                    });
                    // check còn slot offline không
                  if (!newSpot) {
                    await transaction.rollback();
                    return res.status(404).json({ message: "Chỗ đỗ của bạn đang bảo trì và bãi xe đã hết chỗ thay thế." });
                  }
                }

                

                // Cập nhật lại thông tin Spot mới
                spotId = newSpot.id;
                console.log(spotId + "newSpotID");
                area = newSpot.area;
                position = newSpot.position;
                ticketReservationId = reservation.id;
                // Update Reservation và reservationBlock trỏ sang Spot mới
                Promise.all([
                  await model.Reservation.update({ spotId: spotId, status: 'CHECKIN' },{ where: { id: reservation.id }, transaction }),
                  await model.ReservationBlock.update({spotId: spotId, status: 'CHECKIN'}, {where:{reservationId: reservation.id}})
                ])
                
            }else {
            spotId = spot.id;
            area = spot.area;
            position = spot.position;
            console.log("reservatioid"+ reservation.id)
            ticketReservationId = reservation.id;
              // nếu mà spot vẫn hoạt động tốt
               Promise.all([
                  await model.Reservation.update({ status: 'CHECKIN' },{ where: { id: reservation.id }, transaction }),
                  await model.ReservationBlock.update({status: 'CHECKIN'}, {where:{reservationId: reservation.id}})
                ])
            }

          }
           
        // KHÁCH VÃNG LAI (OFFLINE)
        if(offTransfer) {
          console.log("ghe offline")
            // 1. Tìm ghế OFFLINE trước
            const spotOffline = await model.Spot.findOne({
                where: {
                    status: true,
                    isActive: true,
                    vehicleType: vehicleType,
                    slotType: "OFFLINE",
                }, 
                lock: transaction.LOCK.UPDATE,
                paranoid: true, 
                transaction
            });

            if (spotOffline) {
                spotId = spotOffline.id;
                area = spotOffline.area;
                position = spotOffline.position;
            } else {
                // 2. Nếu hết ghế Offline -> Check ghế Online còn trống
                const availableSpots = await findAvailableSpotOnlie(vehicleType, 'ONLINE', transaction);
                
                if (availableSpots.length === 0) {
                    await transaction.rollback();
                    return res.status(404).json({ message: "Bãi xe đã hết chỗ trống" });
                }
                
                spotId = availableSpots[0].id;
                area = availableSpots[0].area;
                position = availableSpots[0].position;
            }

            // Tạo Reservation ảo cho khách vãng lai
            const newReservation = await model.Reservation.create({
                dateIn: now,
                status: "CHECKIN",
                channel: 'OFFLINE',
                plate: plate,
                vehicleType: vehicleType,
                spotId: spotId,
            }, { transaction });

            ticketReservationId = newReservation.id;
        }

        
        // Update trạng thái Spot 
        await model.Spot.update(
            { status: false }, 
            { where: { id: spotId }, transaction }
        );

        // Tạo Ticket 
        const ticket = await model.Ticket.create({
            date: new Date(),
            reservationId: ticketReservationId,
            spotId: spotId,
            vehicleType: vehicleType,
            startTime: new Date(),
            status: 'active',
            plate: plate,
            staffUsername: req.username
        }, { transaction });

        console.log("Result" + area + " " + position);
        await transaction.commit();

       io.getIO().emit('parkingStatus', {
          action: 'updateParking',
          data: {
            spotId: spotId,
            status: false
          }
        })
        res.status(200).json({
            message: "Check-in thành công",
            area: area,
            position: position,
            plate: plate,
            type: vehicleType,
            ticketId: ticket.id 
        });
        try {
          const uploadResult = await uploadTask;
          await model.Ticket.update(
            { urlCloudinaryCheckIn: uploadResult.secure_url,},
            {
            where: {
              id: ticket.id
            }
          })
        } catch (error) {
          console.log(error);
        }
        
        
    } catch (err) {
        console.error( err);
        await transaction.rollback();
        next(err);
    }

};
// /staff/free-entry
exports.postImageOut = async(req,res,next) => {
  const filePath = req.file.path;
  const plateTask = platerecognizer(filePath);
  const uploadTask = uploadAndCleanup(filePath);
  // tạo 1 phiên giao 

  
    const dateTime =  moment().tz("Asia/Ho_Chi_Minh").format('YYYY-MM-DD HH:mm:ss');
    
    
    // lấy dữ liệu
    const data = await plateTask;
    const type = data.results[0].vehicle.type;
    const plate = data.results[0].plate?.toUpperCase();
    console.log(type + " "+ plate)

    // check xem bên thứ 3 có scan được biển số và loại xe không
    if(!type || !plate) {
      return res.status(400).json({message: "không thể xác định được loại xe hoặc biển số vui lòng chụp lại"});
    }

    // bên thứ 3 trả về xe máy là motorbike, oto tra nhiều loại suv ->  xử lí
    let vehicleType = 'CAR';
    if(type === "Motorcycle"){
      vehicleType = "MOTORBIKE";
    }
    console.log(vehicleType);
    // gọi trc để lấy biểu phí
    const [parkingRateStandard, parkingRateOvertime, ticket] = await Promise.all([

        model.ParkingRate.findOne({
              raw: true,
              where: {
                status: 'active',
                ticketType: 'STANDARD',
                vehicleType:vehicleType, 

              }}) ,
        model.ParkingRate.findOne({
                raw: true,
                where: {
                status: 'active',
                ticketType: 'OVERTIME',
                vehicleType:vehicleType, 
              }}),
              
            // tìm ticket của xe
        model.Ticket.findOne({
              raw: true,
              where: {
              plate: plate,
              vehicleType: vehicleType,
              status: 'active'
            }})

    ]);
    // kiểm tra ticket của xe có tồn tại không
    if(!ticket){
      return res.status(404).json({message: "xe này không tồn tại"})
    }
    // console.log(ticket)
    console.log(ticket)
    const [reservation, payment] = await Promise.all([
          // khởi tạo lấy reservation trước
          model.Reservation.findOne({raw: true, where: {id: ticket.reservationId}}),
          
          // tìm kiếm payment khi đặt online
          model.Payment.findOne({
              raw: true,
              where: {
                reservationId: ticket.reservationId,
                status: 'SUCCEEDED',
              }
            })

    ]);
    console.log("reservation" + reservation)

      let totalPrice = 0;
      // tính tiền
      const start = new Date(ticket.startTime);
      const end = new Date(dateTime)
      const diffInMillis = end - start;

      // chuyển về giờ
      const hours = diffInMillis / (1000 * 60 * 60); 
      console.log(hours + "hours")
      const minutes = hours * 60;
      const standard = await parkingRateStandard;
      const overtime = await parkingRateOvertime;
      
      let payedMoney = 0;
      // th: có payment
      console.log("payment day" + payment);
      if(payment){
          payedMoney = payment.costParking;
          currency = payment.currency;
          console.log(payedMoney + " " + currency)
          if(hours > reservation.blockCount){
            console.log("luong chạy vao day")
            totalPrice = reservation.blockCount*standard.unitPrice + overtime.unitPrice*(Math.ceil(hours - reservation.blockCount)) - payedMoney;
          }else{
            totalPrice = 0;
          }
         
      }else{
        // tìm payment trường hợp mà khách đến trước sớm > 60p, hệ thống chuyển về slot offline, tìm resevation noshow mà trong khoảng thời gian đỗ để trừ tiền cho khách
        const payments = await findPaymentNoSHow(start, end);
        if(payments.length > 0){
          for(let i = 0 ;i < payments.length ;i ++){
            payedMoney += payments[i].costParking;
          }
        }
        if(hours <= 24 + overtime.gracePeriod/60){
              totalPrice = Math.ceil(hours) * standard.unitPrice - payedMoney;
            }else{
              totalPrice = 24*standard.unitPrice + overtime.unitPrice*(Math.ceil(hours - 24)) - payedMoney;
            }
      } 
      
      try { 
          const transaction = await sequelize.transaction();
          // cập nhật trạng thái của spot
          await model.Spot.update({status: true}, {where: {id: ticket.spotId}, transaction});
          // đẩy ảnh lên cloud, để nhận về đường dẫn của ảnh
          const uploadResult = await uploadTask;
          console.log("totalPrice" + " " + totalPrice);
          console.log("payedMoney" + " " + payedMoney)
          if(totalPrice < 0) totalPrice = 0;
          // tạo hoá đơn
          const bill = await model.Bill.create({
            channel: reservation.channel,
            payedMoney: payedMoney,
            startTime: start,
            finishTime: end,
            totalPrice: totalPrice,
            urlCloudinaryCheckIn: ticket.urlCloudinaryCheckIn,
            urlCloudinaryCheckOut: uploadResult.secure_url,
            ticketId: ticket.id
          }, {transaction});

          // check bill
          if(!bill) {
            transaction.rollback();
            return res.status(500).json({message: "lỗi server không thể tạo bill"})      
          }

          // chạy song song 2 sql updateS
          await Promise.all([
            model.Ticket.update({finishTime: new Date() ,status: 'inactive',},
            {where: {id: ticket.id}, transaction}),
            model.Reservation.update({status: 'CHECKOUT'},
            {where: {id: ticket.reservationId}, transaction}),
            model.ReservationBlock.update({status: 'CHECKOUT'},
              {where: { reservationId: ticket.reservationId}})
          ])

          await transaction.commit();

          // phải chuyển về gmt+7 vì khi res.status(200).json nó tự động trả về gmt 0
          const billResponse = bill.toJSON();
          billResponse.startTime = moment(bill.startTime).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss");
          billResponse.finishTime = moment(bill.finishTime).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD HH:mm:ss");
          io.getIO().emit('parkingStatus', {
          action: 'updateParking',
          data: {
            spotId: reservation.spotId,
            status: true,
          }
        })
          return res.status(200).json({
            message: "success",
            bill: billResponse, 
            plate: plate
          });
      } catch (error) {
        console.log(error);
        await transaction.rollback();
        next(error);
    }
}

// /staff/infor
exports.getInfor = async (req,res,next) =>{
  console.log(req.username)
  const staff = await model.Staff.findByPk(
    req.username, {attributes: ['username', 'name', 'date', 'role']}
  );

  if(!staff) return res.status(404).json({message: "user không tồn tại"});
  return res.status(200).json({
    message: "success",
    staff: staff
  })
}