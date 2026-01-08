const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');
require('dotenv').config();
const { Op } = require('sequelize');
const createNewSpots = require('../helper/createNewSpots')
const io = require('../socket');

const moment = require('moment-timezone')


//============================================================================= STAFF=======================================================================

//admin/staffs
exports.getAllStaffs = async (req,res, next) => {
  try{
      const staffs = await model.Staff.findAll({
      where: {
        role: "staff",
        
      },
      paranoid: true,
      attributes: ["name", "date","username", "status", "createdAt"],
      order: [['createdAt', 'DESC']],
      raw: true
      });
      res.status(200).json({
        message: "success",
        staffs: staffs || []
      })

  }catch(err){
    console.log(err);
    next(err);
  }
   
}
// admin/staff/:id
exports.getStaff = async (req,res,next) => {
  const username = req.params.id;
  if(!username) {res.status(404).json({message: "username rỗng"})};
  try {
    const staff = await model.Staff.findOne({
      attributes: ['username', 'name', 'date', 'role', 'status', 'deletedAt'],
      where: {username: username},
      paranoid: false
    })
    if(!staff){res.status(404).json({message: "nhân viên không tồn tại"})};
    return res.status(200).json({
      message: "success",
      staff: staff
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({message: "server bị lỗi không thể lấy được thông tin staff"})
  }
}
// admin/delete/:idStaff
exports.postDeleteStaff = async (req,res,next) => {
  const id = req.params.idStaff;
  const transaction = await sequelize.transaction();
  console.log(id)
  try {
    const ok = await model.Staff.update(
      {
        deletedAt: new Date().toLocaleDateString()
      },
      {
      where: {username: id}, transaction
      }
    );
    if(ok === 0) {
      await transaction.rollback();
      return res.status(404).json({message: "tài khoản này không được tìm thấy"});
    }
    await transaction.commit();
    return res.status(200).json({message: "xoá nhân viên thành công"})
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({message: "server bị lỗi"});
  }
}
// admin/edit/:idStaff
exports.postEditStaff = async(req,res,next) => {
  const id = req.params.idStaff;
  // check tồn tại của staff
  const check = await model.Staff.findOne({
    where:{username: id},
    paranoid: false
  });
  if(!check) return res.status(404).json({
    message: 'id không tồn tại'
  })
  const {name, date, pw, status} = req.body;
  const updateData = {
    name: name,
    date: date,
    status: status,
  }
  if(pw.trim() !== ""){
    const pw_hash = bcrypt.hashSync(pw, 10);
    updateData.password_hash = pw_hash;
  }
  const transaction = await sequelize.transaction();
  try {
     await model.Staff.update(
    updateData,
    {
      where: {username: id}, transaction
    });
    await transaction.commit();
    return res.status(200).json({message: "Cập nhật thành công"});
  } catch (error) {
    console.log( error);
    await transaction.rollback();
    return res.status(500).json({message: "server bị lỗi"});
  }
}
// admin/newStaff
exports.postNewStaff = async (req,res,next) => {
  try {
    const {name, date, username, password} = req.body;
    console.log(username + "+" + password);
    if(!name || !date || !username || !password) res.status(400).json({message: "vui lòng nhập đủ các trường dữ liệu"})
    const checkStaff = await model.Staff.findOne({
      where: {username: username},
      paranoid: false
    })
    if(checkStaff) return res.status(409).json({
      message: "username đã tồn tại"
    })
    const pw_hash = await bcrypt.hashSync(password, 10);
    console.log(pw_hash)
    await model.Staff.create({
      name: name,
      date: date,
      username: username,
      password_hash: pw_hash,
      role: 'staff',
      status: 1
    })
    res.status(200).json({
      message: 'success'
    })
  } catch (err) {
    console.log(err);
    next(err);
  }
 
} 

// admin/restore/:idStaff
exports.postRestoreStaff = async (req, res, next) => {
  const id = req.params.idStaff;
  if(!id) return res.status(400).json({
    message: "vui lòng kiểm tra đầu vào"
  })
  const transaction = await sequelize.transaction();
  try {
    await model.Staff.update(
    {
      deletedAt: null,
    },{
      where: {
        username: id,
      },
      paranoid: false,
      transaction
    })
    await transaction.commit();
    return res.status(200).json({message: "update thành công"})
  } catch (error) {
    console.log(error);
    await transaction.rollback();
  }
}

// /admin/trash/deletedStaffs
exports.getDeletedStaff = async (req,res,next) => {
  const deletedStaffs = await model.Staff.findAll({where:{
    deletedAt: {[Op.ne] : null},
    paranoid: false
  }})
  if(!deletedStaffs) return res.status(200).json({message: "success", staffs: []});
  return res.status(200).json({message: "success", staffs: deletedStaffs});
}


// /admin/infor
exports.getInfor = async (req,res,next) =>{
  const staff = await model.Staff.findByPk(
    req.username,{attributes: ['username', 'name', 'date', 'role']}
  );

  if(!staff) return res.status(404).json({message: "user không tồn tại"});
  return res.status(200).json({
    message: "success",
    staff: staff
  })
}


//==========================================================SPOT=========================================


// /admin/spots/:area
exports.getAllSpotWithArea = async (req,res, next) => {
  const area = req.params.area;
  try {
    const spots = await model.Spot.findAll({
    raw: true,
    attributes: ['id','area', 'position', 'vehicleType', 'slotType', 'status', 'isActive'],
    where: {area: area},
    paranoid: true,
    order: [['position', 'ASC']],
  });
  if(!spots) return res.status(200).json({meseage: "spot trống", spots: []})
  return res.status(200).json({message: "success", spots: spots})
  } catch (error) {
    console.log(error);
  }
  
}

// /admin/spots/:spotId
exports.getSpot = async (req, res, next) => {
  const spotId = req.params.spotId;
  console.log(spotId);
  if(!spotId) return res.status(400).json({message: "thông tin không hợp lệ"})
  const spot = await model.Spot.findOne({
    attributes: ['id', 'area', 'position', 'vehicleType', 'slotType', 'status' ],
    where: {id: spotId}}
  );
  if(!spot){
    return res.status(404).json({message: "spot không hợp lệ"});
  }else{
    return res.status(200).json({
      message: "success",
      spot: spot
    })
  }
}

// admin/trash/deletedSpots

exports.getDeletedSpots = async (req, res, next )=> {
  const spots = await model.Spot.findAll({
    attributes: ['id', 'area', 'position', 'vehicleType', 'slotType', 'deletedAt'],
    where: {
      deletedAt: {[Op.ne]: null}
    },
    paranoid: false,
  })
  if(!spots){
    return res.status(200).json({
      message: "không spot nào bị xoá",
      spots: []
    })
  }else {
    return res.status(200).json({
      message: "success",
      spots: spots
    })
  }
}

// admin/restore/:spotId
exports.postRestoreSpot = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  const spotId = req.params.spotId;
  try {
    const update = await model.Spot.update({
      deletedAt: null
    },{
      where: {id: spotId},
      paranoid: false,
    });
    if(!update) {
      await transaction.rollback();
      return res.status(500).json({message: "lỗi server vui lòng thử lại sau"});
    }else{
      await transaction.commit();
      return res.status(200).json({meseage: "update thành công"});
    }
  } catch (error) {
    await transaction.rollback();
    console.log(error);
  }
  
}

// /admin/trash/deletedStaffs
exports.getDeletedStaffs = async (req, res, next) => {
  const deletedStaffs = await model.Staff.findAll({where: {
    deletedAt: {[Op.ne]: null},
    
  },paranoid: false
});
  console.log(deletedStaffs)
  if(!deletedStaffs) return res.status(200).json({message: "success", staffs: []});
  return res.status(200).json({meseage: "success", staffs: deletedStaffs})
}

// /admin/newSpots
exports.postNewSpots = async (req, res, next) => {
  const {area, slotNumber, vehicleType, slotType} = req.body;
  console.log(req.body);
  if(!area || slotNumber <= 0  || !vehicleType || !slotType){
    return res.status(400).json({message: "thiếu trường dữ liệu, vui lòng check lại dữ liệu gửi đi"});
  }
  const transaction = await sequelize.transaction()
  try {
    const numbers = await model.Spot.count({
      where: {
        area: area,
      },
      paranoid: false,
      transaction,
    });
    console.log(numbers);
    await createNewSpots(area, slotNumber, vehicleType, slotType,numbers, transaction); 
    transaction.commit();
    return res.status(200).json({message: "success"});
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({message: "lỗi server vui lòng thử lại sau"})
  }
}

// /admin/delete/:idSpot
exports.postDeleteSpot = async(req,res,next) => {
  const id  = req.params.idSpot;
  if(!id) return res.status(400).json({message: "không nhận được id"});
  const transaction =  await sequelize.transaction();
  try {
    const spot = await model.Spot.findByPk(id);
    if(!spot) {
      await transaction.rollback();
      return res.status(404).json({meseage: "spotId không hợp lệ"});
    }
    let reservationNumber = await model.Reservation.findOne(
      {where:{
        spotId: id,
        status: {[Op.or]: ['PENDING','CONFIRMED', 'CHECKIN']}
      }});
    if(reservationNumber){
      await transaction.rollback();
      return res.status(409).json({meseage: "hiện tại đang có người đang đặt slot này bạn không thể xoá được"})
    }
    const updateSpot = await model.Spot.update({deletedAt: new Date() },{where: {id: id}});
    await transaction.commit();
    if(!updateSpot) {
      await transaction.rollback();
      return res.staus(500).json("lỗi không thể update") 
    } 
    return res.status(200).json({message: "deleted successfully"});
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({message: "lỗi server vui lòng thử lại sau"})
  }
}

// admin/edit/:idSpot
exports.postEditSpot = async (req, res, next) => {
  const spotId = req.params.idSpot;
  let { isActive } = req.body; 
  const transaction = await sequelize.transaction();
  try {
    const spot = await model.Spot.findByPk(spotId, {
      raw:true,
      attributes: ['isActive'],
      transaction,
      lock: true
    });
    if(!spot){
      await transaction.rollback();
      return res.status(404).json({message: "spot không tồn tại"});
    } 
    if(Boolean(isActive) !== Boolean(spot.isActive)){
      await model.Spot.update({isActive: Boolean(isActive)}, {where:{
        id: spotId
      },
      transaction,
    })
    }
    await transaction.commit();
    return res.status(200).json({message: "success"});
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({message: "lỗi server vui lòng thử lại sau"})
  }
};



//====================================================================================================
// admin/auth/token
exports.getRole = async(req, res, next) => {
  try {
    const token = req.headers['authorization'];
    if(!token) res.status(401).json({message: "Token không tồn tại"});
      const decode = await jwt.verify(token, process.env.SECRET_KEY);
      res.status(200).json({
        message: "success",
        role: decode.role
      })
    } catch (err) {
      console.log(err);
      res.status(401).json({meseage: "Token không hợp lệ hoặc hết hạn"})
    }
}

//admin/slot-available

exports.getSlotAvailable = async (req,res,next) => {
const dateTime = new Date().toLocaleString("sv-SE");
console.log(dateTime)
const date = dateTime.split(" ")[0];
const hour = dateTime.split(" ")[1];
const tineEven = hour.split(":")[0];
const mapStatus = await model.Spot.findAll({
  attributes: ['id', 'area', 'position', 'vehicleType', 'isActive', 'status'],
  paranoid: true,
  include: [
    {
      model: model.ReservationBlock,
      required: false,
      where: {
        date: date,
        blockIndex:hour
      },
      include: [
        {
          model: model.Reservation,
          attributes: ['status', 'channel', 'plate']
        }
      ]
    }
  ]
})

let availableSpot = 0;
let bookedSpot = 0;
let occupiedSpot = 0;
let lockedSpot = 0;
// format dữ liệu trả về
const formattedData = mapStatus.map(spot => {
  let check = 0;
    // 1. Lấy thông tin đặt chỗ (nếu có)
    // Vì ta đã filter theo giờ nên mảng ReservationBlocks chỉ có tối đa 1 phần tử
    const bookingInfo =  spot.ReservationBlocks[0] || spot.ReservationBlocks
    const reservation = bookingInfo ? bookingInfo.Reservation : null;
    

    // 2. Thiết lập mặc định là TRỐNG
    let statusText = 'AVAILABLE';
    let colorCode = '#28a745'; // Màu xanh lá (Bootstrap success)
    let customerType = 'NONE'; // Khách vãng lai hay Online
    if(spot.isActive === false){
      statusText = 'locked',
      colorCode = '#646262ff',
      lockedSpot++;
      check = -2;
    }else {
      // khách đặt online
      if (reservation) {
          customerType = 'ONLINE';
          // đã đặt chỗ chưa checkin
          if (reservation.status === 'CONFIRMED') {
              statusText = 'BOOKED'; 
              colorCode = '#ffc107'; 
              check = -1;
          // đặt chỗ và checkIn rồi
          } else if (reservation.status === 'CHECKIN') {
              statusText = 'OCCUPIED'; 
              colorCode = '#dc3545'; 
              check = 1;
          }
      } else {
        // không đặt online, dựa vào trạng thái của ghế để check khách đến trực tiếp nếu khoá thì đã đỗ còn chưa thì xanh
          if (!spot.status) {
              statusText = 'OCCUPIED';
              colorCode = '#dc3545'; 
              check = 1
          }
      }
    }
    
    if(check === 0) availableSpot ++;
    if(check === 1) occupiedSpot ++;
    if(check === -1) bookedSpot ++;
    return {
        id: spot.id,
        area: spot.area,
        position: spot.position,
        vehicleType: spot.vehicleType, // CAR hoặc MOTORBIKE 
        status: statusText,            // AVAILABLE / BOOKED / OCCUPIED
        color: colorCode,              // Mã màu hex để tô nền
        channel: customerType     // ONLINE / OFFLINE / NONE
    };
});


res.status(200).json({
    message: "success",
    mapStatus: formattedData,
    availableSlot: availableSpot,
    occupiedSlot: occupiedSpot,
    bookedSlot: bookedSpot,
    lockedSpot: lockedSpot
});

}
// /admin/allTickets

exports.postAllTickets = async (req, res, next) => {
  const dateString = req.body.date;
  const dateVn = moment.tz(dateString, "Asia/Ho_CHi_Minh");
  const endDay = dateVn.clone().endOf('day');
  const startDay = dateVn.clone().startOf('day');
  const tickets = await model.Ticket.findAll({
    raw: true,
    attributes: ['id', 'spotId', 'startTime', 'finishTime', 'plate', 'vehicleType', 'status'],
    where: {
      startTime: {[Op.between]: [startDay.toDate(), endDay.toDate()]}
    }
    
  })
  if(!tickets) return res.status(200).json({
    meseage: "success", 
    tickets: []
  })
  
  const mapTickets = tickets.map(ticket => {
    let colorCode = '#dc3545'
    if(ticket.status === 'active') colorCode = '#28a745'
    return {
      id: ticket.id,
      spotId: ticket.spotId,
      TimeIn: ticket.startTime,
      TimeOut: ticket.finishTime,
      plate: ticket.plate,
      vehicleType: ticket.vehicleType,
      colorCode: colorCode,
      status: ticket.status

    }
  })

  return res.status(200).json({
    message: "success",
    tickets: mapTickets
  })

}

// xem toàn bộ reservation hiện tại
// admin/nowReservation
// code lại
exports.postReservation = async(req, res, next) => {
    const dateString = req.body.date;
    const dateVN = moment.tz(dateString, "Asia/Ho_Chi_Minh");
    const endDay = dateVN.clone().endOf('day');
    const startDay = dateVN.clone().startOf('day');
    const reservations = await model.Reservation.findAll({
      raw: true,
      where: {
        dateIn: {[Op.between]: [startDay.toDate(),endDay.toDate()]},
        status: {[Op.in]: ['CONFIRMED', 'CHECKIN', 'CHECKOUT', 'NOSHOW']}
      }
    })
    if(reservations.length > 0) return res.status(200).json({
      message: "success",
      reservations: reservations
    })
    return res.status(200).json({
      message: "success",
      reservations: []
    })

}

// xem realtime doanh thu của ngày hôm nây
// admin/nowRevenue
exports.getNowRevenue = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); 

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const bills = await model.Bill.findAll({
      attributes: ['payedMoney', 'totalPrice'], 
      where: {
        finishTime: {
          [Op.between]: [startOfDay, endOfDay] 
        }
      },
      raw: true 
    });

    let moneySum = 0;
    
    bills.forEach(bill => {
      const payed = Number(bill.payedMoney) || 0;
      const remain = Number(bill.totalPrice) || 0;
      
      moneySum += (payed + remain);
    });
    io.getIO().emit('totalPriceADay', {
        action: 'updateTotalPriceADay',
        data: {
          sum: moneySum
        }
      });
    return res.status(200).json({
      message: "success",
      sum: moneySum
    });

  } catch (error) {
    console.error("Lỗi tính doanh thu:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// admin/MonthlyRevenue
//biểu đồ doanh thu theo tháng
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    // const currentYear = 2025
    // 1. Lấy dữ liệu từ DB, gom nhóm theo Tháng
    const revenueData = await model.Bill.findAll({
      attributes: [
        // Lấy ra tháng (định dạng 'YYYY-MM', ví dụ '2025-01')
        [sequelize.fn('DATE_FORMAT', sequelize.col('finishTime'), '%Y-%m'), 'month'],
        
        // Tính tổng tiền: SUM(payedMoney + totalPrice)
        [sequelize.literal('SUM(payedMoney + totalPrice)'), 'totalRevenue']
      ],
      where: {
        // Chỉ lấy dữ liệu trong năm nay (để tránh cộng nhầm tháng 1 năm ngoái vào tháng 1 năm nay)
        [Op.and]: [
          sequelize.where(sequelize.fn('YEAR', sequelize.col('finishTime')), currentYear)
        ]
      },
      // Gom nhóm theo tháng
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('finishTime'), '%Y-%m')],
      // Sắp xếp từ tháng 1 -> 12
      order: [[sequelize.col('month'), 'ASC']],
      raw: true
    });

    const fullYearData = [];
    const labels = [];
    
    // Tạo vòng lặp 12 tháng
    for (let i = 1; i <= 12; i++) {
      // Tạo key tháng dạng '2025-01', '2025-02'... để so sánh
      const monthKey = `${currentYear}-${String(i).padStart(2, '0')}`;
      
      // Tìm xem trong kết quả SQL có tháng này không
      const foundMonth = revenueData.find(item => item.month === monthKey);
      
      const revenue = foundMonth ? Number(foundMonth.totalRevenue) : 0;
      
      fullYearData.push(revenue);
      labels.push(`Tháng ${i}`);
    }

    return res.status(200).json({
      message: "success",
      year: currentYear,
      chartData: {
        labels: labels,     // ["Tháng 1", "Tháng 2", ...]
        data: fullYearData  // [500000, 0, 120000, ...] -> Đủ 12 phần tử
      }
    });

  } catch (error) {
    console.error("Lỗi lấy doanh thu tháng:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};


// biểu đồ tỉ lệ ô tô / xe máy trong bãi
// /admin/vehicleRatio
exports.getVehicleRatio = async (req, res, next )=> {
  let onlineCarNumber = 0;
  let offlineCarNumber = 0;
  let onlineMotorNumber = 0;
  let offlineMotorNumber = 0;

  const vehicleNumber = await model.Spot.findAll({
    attributes: ['vehicleType', 'slotType'],
    paranoid: true,
    raw: true
  })
  vehicleNumber.forEach(spot => {
    if(spot.vehicleType === 'CAR' && spot.slotType === 'ONLINE') onlineCarNumber ++;
    else if(spot.vehicleType === 'CAR' && spot.slotType === 'OFFLINE') offlineCarNumber ++;
    else if(spot.vehicleType === 'MOTORBIKE' && spot.slotType === 'ONLINE') onlineMotorNumber ++;
    else if(spot.vehicleType === 'MOTORBIKE' && spot.slotType === 'OFFLINE') offlineMotorNumber ++;
  })

  const vehicleSumOnline = onlineCarNumber + onlineMotorNumber  || 1;
  const vehicleSumOffline = offlineCarNumber + offlineMotorNumber || 1;
  const onlineCarRate = Math.round((onlineCarNumber/vehicleSumOnline)*100);
  const onlineMotorRate = Math.round((onlineMotorNumber/vehicleSumOnline)*100);
  const offlineCarRate = Math.round((offlineCarNumber / vehicleSumOffline) * 100);
  const offlineMotorRate = Math.round((offlineMotorNumber /vehicleSumOffline) * 100);
  
  return res.status(200).json({
    message: "success",
    onlineCarRate,
    onlineMotorRate ,
    offlineCarRate, 
    offlineMotorRate ,
  })
}
// /admin/newParkingRateType
exports.postNewParkingRateType = async (req, res, next) => {
  const {vehicleType, unitPrice, ticketType} = req.body;
  if(!vehicleType || !unitPrice || !ticketType) return res.status(404).json({message: "vui lòng gửi đầy đủ dữ liệu đầu vào"});
  const transaction = await sequelize.transaction();
  try {
    await model.ParkingRate.update({status: 'inactive'}, {where: {
      vehicleType: vehicleType,
      ticketType: ticketType,
    }, transaction});
    await model.ParkingRate.create({
      vehicleType: vehicleType,
      unitPrice: unitPrice,
      ticketType: ticketType,
      status: 'active'
    }, {transaction});
    await transaction.commit();
    return res.status(200).json({message: 'success'})
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({message: "lỗi server vui lòng thử lại sau"})
  }
}
// /admin/ParkingRate
exports.getParkingRate = async (req,res,next) => {
  const parkingRate = await model.ParkingRate.findAll({
    attributes: ['vehicleType', 'unitPrice', 'currency', 'ticketType', 'createdAt', 'updatedAt', 'status'],
  })
  if(!parkingRate) return res.status(404).json({message: "không tìm thấy biểu phí nào", parkingRate: []});
  return res.status(200).json({message: 'success', parkingRate: parkingRate});
}

// /admin/traffic-flow
exports.postTrafficFlow = async (req, res, next ) => {
  const date = req.body.date;
  if(!date) return res.status(404).json({message: "vui lòng gửi ngày muốn thống kê"});
  let checkInNumbers = new Array(24).fill(0);
  let checkOutNumbers = new Array(24).fill(0);
  const tickets =  await model.Ticket.findAll({where: {date: date}, raw: true});
  tickets.map(ticket => {
    // console.log(ticket)
    const timeIn = ticket.startTime.toLocaleString("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh", 
    hour12: false 
    });
    console.log(timeIn);
    const hourIn = timeIn.split(" ")[1].split(":")[0];
    const timeOut = ticket.finishTime.toLocaleString("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh", 
    hour12: false 
    });
    console.log(timeOut)
    const dayOut = timeOut.split(" ")[0];
    const hourOut = timeOut.split(" ")[1].split(":")[0];
    checkInNumbers[hourIn-1]++;
    if(dayOut === date) checkOutNumbers[hourOut-1]++;
  })

  return res.status(200).json({
    message: "success",
    checkInNumbers: checkInNumbers,
    checkOutNumbers: checkOutNumbers
  })
}