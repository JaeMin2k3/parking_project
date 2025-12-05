const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const platerecognizer = require('../helper/plateRecognizer');
const checkTime = require('../helper/checkTime')
const sequelize = require('../config/database');
const uploadAndCleanup = require('../helper/uploadAndCleanup');
const checkAvailableTime = require('../helper/checkAvailableTime')
const {Op} = require('sequelize');
const findReplaceTime = require('../helper/findReplaceTime')
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
exports.postImageIn = async (req, res, next) => {
   // nhận dữ liệu từ req
    const filePath = req.file.path; 
    // khởi tạo trc
    const plateTask = platerecognizer(filePath); 
    const uploadTask = uploadAndCleanup(filePath); 

    let transaction; 

    try {
        //  lấy thời gian hiện tại
        const now = new Date();
        const dateTime = now.toLocaleString("sv-SE"); 
        const date = dateTime.split(" ")[0];
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentHour = hour + minute / 60;
        console.log(currentHour) 

        // Đợi kết quả nhận diện biển số 
        const data = await plateTask;
        const typeRaw = data.results[0]?.vehicle?.type;
        const plate = data.results[0]?.plate?.toUpperCase();

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

        
        transaction = await sequelize.transaction();

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
        // 2.2 Tìm Reservation hợp lệ
        const reservation = await model.Reservation.findOne({
            where: {
                plate: plate,
                status: "CONFIRMED",
                vehicleType: vehicleType,
                channel: 'ONLINE',
                [Op.or]: [
                    // Vé trong ngày
                    {
                        dateIn: date,
                        [Op.and]: [
                            sequelize.literal(`(startBlock + blockCount - 1/6) > ${currentHour}`),
                            sequelize.literal(`startBlock <= ${currentHour}`) 
                        ]
                    },
                    // Vé qua đêm (check ngày ra)
                    {
                        dateOut: date,
                        [Op.and]: [
                          sequelize.literal(`(startBlock + blockCount) > (${currentHour} + 24 + 1/6)`)
                        ]
                    }
                ]
            },
            transaction
        });
        console.log(reservation);

        let spotId = null;
        let area = null;
        let position = null;
        let ticketReservationId = null;
        let bookedStart = hour; 
        let bookedEnd = null; 

        //  CÓ ĐẶT TRƯỚC (ONLINE) 
        if (reservation) {
            // Check logic thời gian chi tiết 
            const isValidTime = await checkTime(reservation);
            if (!isValidTime) {
                await transaction.rollback();
                return res.status(404).json({
                    message: `Chưa đến giờ vào hoặc đã quá hạn. Thời gian đặt: ${reservation.startBlock}h`
                });
            }

            spotId = reservation.spotId;
            area = reservation.area;
            position = reservation.position;
            ticketReservationId = reservation.id;
            bookedStart = reservation.startBlock;
            // Tính bookedEnd dựa trên reservation
            bookedEnd = (reservation.startBlock + reservation.blockCount) % 24;

            // Kiểm tra Spot có khả dụng không (Phòng trường hợp Spot bị hỏng sau khi khách đặt)
            const spot = await model.Spot.findOne({
                where: { id: spotId, }, 
                paranoid: true,
                transaction
            });

            // Nếu Spot lỗi/bảo trì -> Tìm Spot thay thế
            if (!spot || spot.isActive === false || spot.status === false) {
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
                
                // Update Reservation và reservationBlock trỏ sang Spot mới
                Promise.all([
                  await model.Reservation.update({ spotId: spotId, status: 'CHECKIN' },{ where: { id: reservation.id }, transaction }),
                  await model.ReservationBlock.update({spotId: spotId, status: 'CHECKIN'}, {where:{reservationId: reservation.id}})
                ])
                
            }else {
              // nếu mà spot vẫn hoạt động tốt
               Promise.all([
                  await model.Reservation.update({ status: 'CHECKIN' },{ where: { id: reservation.id }, transaction }),
                  await model.ReservationBlock.update({status: 'CHECKIN'}, {where:{reservationId: reservation.id}})
                ])
            }


        } 
        // KHÁCH VÃNG LAI (OFFLINE)
        else {
            // 1. Tìm ghế OFFLINE trước
            const spotOffline = await model.Spot.findOne({
                where: {
                    status: true,
                    isActive: true,
                    vehicleType: vehicleType,
                    slotType: "OFFLINE",
                }, 
                paranoid: true, 
                transaction
            });

            if (spotOffline) {
                spotId = spotOffline.id;
                area = spotOffline.area;
                position = spotOffline.position;
            } else {
                // 2. Nếu hết ghế Offline -> Check ghế Online còn trống (dùng hàm checkAvailableTime đã sửa)
                const availableSpots = await checkAvailableTime(vehicleType, transaction);
                
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
                dateIn: date,
                status: "CHECKIN",
                channel: 'OFFLINE',
                plate: plate,
                vehicleType: vehicleType,
                spotId: spotId,
            }, { transaction });

            ticketReservationId = newReservation.id;
            bookedEnd = null; // Khách vãng lai có thể không có giờ ra cố định
        }

        // --- BƯỚC CHUNG: TẠO TICKET & UPDATE SPOT ---

        // Update trạng thái Spot thành "Đang có xe" (status = false)
        await model.Spot.update(
            { status: false }, 
            { where: { id: spotId }, transaction }
        );

        // Tạo Ticket (Lưu ý: urlCloudinaryCheckIn để NULL tạm thời)
        const ticket = await model.Ticket.create({
            date: date,
            reservationId: ticketReservationId,
            spotId: spotId,
            vehicleType: vehicleType,
            bookedStart: bookedStart,
            bookedEnd: bookedEnd,
            startTime: dateTime,
            status: 'active',
            plate: plate,
            staffUsername: req.username
        }, { transaction });

        // COMMIT TRANSACTION NGAY LẬP TỨC
        await transaction.commit();

        // --- GIAI ĐOẠN 3: PHẢN HỒI KHÁCH HÀNG (MỞ BARIE) ---
        // Trả kết quả ngay cho client
        res.status(200).json({
            message: "Check-in thành công",
            area: area,
            position: position,
            plate: plate,
            type: vehicleType,
            ticketId: ticket.id // Trả về ID để client biết hoặc log
        });

        // --- GIAI ĐOẠN 4: BACKGROUND JOB (UPLOAD ẢNH & UPDATE DB) ---
        // Phần này chạy ngầm sau khi hàm đã return response
        try {
            // Bây giờ mới await kết quả upload
            const uploadResult = await uploadTask;
            
            if (uploadResult && uploadResult.secure_url) {
                // Update link ảnh vào ticket
                await model.Ticket.update(
                    { urlCloudinaryCheckIn: uploadResult.secure_url },
                    { where: { id: ticket.id } }
                );
                console.log(`[Success] Đã cập nhật ảnh check-in cho xe ${plate}`);
            }
        } catch (bgError) {
            console.error(`[Background Error] Lỗi upload ảnh xe ${plate}:`, bgError);
            // Gợi ý: Lưu log lỗi vào bảng riêng để có cronjob chạy quét và upload lại nếu cần
        }

    } catch (err) {
        console.error("Lỗi Check-in:", err);
        // Chỉ rollback nếu transaction chưa commit/rollback
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        next(err);
    }
};
// /staff/free-entry
exports.postImageOut = async(req,res,next) => {
  const filePath = req.file.path;
  const plateTask = platerecognizer(filePath);
  const uploadTask = uploadAndCleanup(filePath);
  // tạo 1 phiên giao 
  const transaction = await sequelize.transaction();
  try {
    let dateTime = new Date().toLocaleString("sv-SE");
    
    
    // khởi tạo trước gọi api bên thứ 3 và đẩy ảnh lên cloud
    
    // lấy dữ liệu
    const data = await plateTask;
    const type = data.results[0].vehicle.type;
    const plate = data.results[0].plate?.toUpperCase();
    console.log(type + " "+ plate)

    // check xem bên thứ 3 có scan được biển số và loại xe không
    if(!type || !plate) {
      transaction.rollback();
      return res.status(400).json({message: "không thể xác định được loại xe hoặc biển số vui lòng chụp lại"});
    }

    // bên thứ 3 trả về xe máy là motorbike, oto tra nhiều loại suv,.. -> phải xử lí
    let vehicleType = 'CAR';
    if(type === "Motorcycle"){
      vehicleType = "MOTORBIKE";
    }
    console.log(vehicleType);
    // gọi trc để lấy biểu phí
    const parkingRateStandard = model.ParkingRate.findOne({where: {
        status: 'active',
        ticketType: 'STANDARD',
        vehicleType:vehicleType, 

      }, transaction}) ;
      const parkingRateOvertime = model.ParkingRate.findOne({where: {
        status: 'active',
        ticketType: 'STANDARD',
        vehicleType:vehicleType, 

      }, transaction}) ;
    // tìm ticket của xe
    const ticket = await model.Ticket.findOne({where: {
      plate: plate,
      vehicleType: vehicleType,
      status: 'active'
    }, transaction});
    // lấy reservation
    const reservation = model.Reservation.findOne({where: {id: ticket.reservationId}});
    
    // tìm kiếm payment khi đặt online
    const payment = await model.Payment.findOne({
        where: {
          reservationId: ticket.reservationId,
          status: 'SUCCEEDED',
        }
      }, transaction);

    // spot của xe
      const spot = await model.Spot.findOne({where: {
        id: ticket.spotId,
        
      },
      paranoid: false
    })
      console.log(spot)

    // kiểm tra ticket của xe có tồn tại không
    if(!ticket){
      await transaction.rollback();
      return res.status(404).json({message: "xe này không tồn tại"})
    }

      let totalPrice = 0;
      

      // tính tiền
      const start = new Date(ticket.startTime);
      const end = new Date(dateTime)
      const diffInMillis = end - start;

      // chuyển về giờ
      const hours = diffInMillis / (1000 * 60 * 60); 
      const minutes = hours * 60;
      const standard = await parkingRateStandard;
      const overtime = await parkingRateOvertime;
      const reservation1 = await reservation;
      let payedMoney = 0;
      // th: có payment
      if(payment){
          payedMoney = payment.costParking;
          currency = payment.currency;
          // trường hop nay xay ra khi ghe dat online bị loi he thong chuyen sang offline cho khach
          if(spot.slotType === 'OFFLINE'){
            if(hours <= 24 + overtime.gracePeriod/60){
              totalPrice = Math.ceil(hours)*standard.unitPrice - payedMoney;
            await model.Spot.update({status: true}, {where: {id: ticket.spotId}, transaction})
            }else{
              totalPrice = 24*standard.unitPrice + overtime.unitPrice*(Math.ceil(hours -24)) - payedMoney;
            }
          }else{
            // th nay là chỗ đỗ xe cho online nên không cần update spot
            if(hours > reservation1.blockCount + overtime.gracePeriod/60){
              totalPrice = (Math.ceil(hours - reservation1.blockCount)) * overtime.unitPrice;
            }else{
              totalPrice = 0;
            }
            
      }
      }else{
        // th không có payment
        if(hours <= 24 + overtime.gracePeriod/60){
              totalPrice = Math.ceil(hours) * standard.unitPrice;
            }else{
              totalPrice = 24*standard.unitPrice + overtime.unitPrice*(Math.ceil(hours - 24));
            }
          await model.Spot.update({status: true}, {where: {id: ticket.spotId}, transaction})
      }
      // đẩy ảnh lên cloud, để nhận về đường dẫn của ảnh
      const uploadResult = await uploadTask;

      // tạo hoá đơn
      const bill = await model.Bill.create({
        channel: spot.slotType,
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

      // chạy song song 2 sql update -> rút gắn thời gian
      await Promise.all([
        await model.Ticket.update({finishTime: dateTime,status: 'inactive',},
        {where: {id: ticket.id}, transaction}),
        await model.Reservation.update({status: 'CHECKOUT'},
        {where: {id: ticket.reservationId}, transaction})
      ])

      await transaction.commit();

      // phải chuyển về gmt+7 vì khi res.status(200).json nó tự động trả về gmt 0
      const billResponse = bill.toJSON();
      billResponse.startTime = new Date(bill.startTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      billResponse.finishTime = new Date(bill.finishTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
       return res.status(200).json({
        message: "success",
        bill: billResponse, 
        plate: plate
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