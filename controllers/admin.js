const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');
require('dotenv').config();
const { Op } = require('sequelize');
const createNewSpots = require('../helper/createNewSpots')
// admin/login
exports.postLogin = async(req, res, next) => {
  const {username, password} = req.body;  
  const admin = await model.Staff.findOne({
    where: {username, role: "admin"},
    attributes: ["username", "password_hash", "role"],
    raw: true
  })

  if(admin){ 
    // console.log(admin);
    const oke =  await bcrypt.compare(password, admin.password_hash);
    if(oke){
      jwt.sign({id: admin.username, role: admin.role}, process.env.SECRET_KEY, {expiresIn: "24h"},
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
      message: "Thông tin đăng nhập không hợp lệ"
    }
  )
}

//admin/staffs
exports.getAllStaffs = async (req,res, next) => {
  try{
      const staffs = await model.Staff.findAll({
      where: {
        role: "staff",
        paranoid: false
      },
      attributes: ["name", "date","username", "status", "createdAt",'deletedAt'],
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
  if(!username) {res.status(404).json({message: "username đang rỗng"})};
  try {
    const staff = await model.Staff.findOne({
      attributes: ['username', 'name', 'date', 'role', 'status', 'deletedAt'],
      where: {username: username}
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
exports.postResortSpot = async (req, res, next) => {
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
      }, transaction
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
    deletedAt: {[Op.ne] : null}
  }})
  if(!deletedStaffs) return res.status(200).json({message: "success", staffs: []});
  return res.status(200).json({message: "success", staffs: deletedStaffs});
}

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
// /admin/spots/:area
exports.getAllSpotWithArea = async (req,res, next) => {
  const area = req.params.area;
  const spots = await model.Spot.findAll({
    attributes: ['area', 'position', 'vehicleType', 'slotType', 'status'],
    where: {area: area},
    paranoid: true,
    order: [['position', 'ASC']],
  });
  if(!spots) return res.status(200).json({meseage: "spot trống", spots: []})
  return res.status(200).json({message: "success", spots: spots})
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
    deletedAt: {[Op.ne]: null}
  }});
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
  const transaction =  await sequelize.transaction();
  try {
    const spot = await model.Spot.findOne({where: {id: id}});
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
    await transaction.commit();
    return res.status(200).json({message: "deleted successfully"});
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({message: "lỗi server vui lòng thử lại sau"})
  }
}

// admin/edit/:idSpot
exports.postEditSpot = async (req, res, next) => {
  const spotId = req.body.idSpot;
  const { status } = req.body; 
  const transaction = await sequelize.transaction();
  try {
    const spot = await model.Spot.findByPk(spotId, {
      transaction,
      lock: true
    });
    if(!spot) return res.status(404).json({message: "spot không tồn tại"});
    if(status !== spot.status){
      await model.Spot.update({status: status}, {where:{
        id: spotId
      }})
    }
    await transaction.commit();
    return res.status(200).json({message: "success"});
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({message: "lỗi server vui lòng thử lại sau"})
  }
};

// ========== REPORTS & CHARTS ==========

// /admin/report/monthly-revenue
// GET /admin/report/monthly-revenue?year=2025&month=11
exports.getMonthlyRevenue = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;

    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Initialize revenue array for each day
    const dailyRevenue = Array(daysInMonth).fill(0).map((_, index) => ({
      day: index + 1,
      revenue: 0,
      billCount: 0,
      reservationCount: 0
    }));

    // Get revenue from Bills (walk-in customers)
    const bills = await model.Bill.findAll({
      attributes: [
        [sequelize.fn('DAY', sequelize.col('paid_at')), 'day'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'billCount']
      ],
      where: {
        payment_status: 'PAID',
        paid_at: {
          [Op.between]: [
            new Date(year, month - 1, 1),
            new Date(year, month, 0, 23, 59, 59)
          ]
        }
      },
      group: [sequelize.fn('DAY', sequelize.col('paid_at'))],
      raw: true
    });

    // Get revenue from Payments (online reservations)
    const payments = await model.Payment.findAll({
      attributes: [
        [sequelize.fn('DAY', sequelize.col('updatedAt')), 'day'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'paymentCount']
      ],
      where: {
        status: 'SUCCEEDED',
        updatedAt: {
          [Op.between]: [
            new Date(year, month - 1, 1),
            new Date(year, month, 0, 23, 59, 59)
          ]
        }
      },
      group: [sequelize.fn('DAY', sequelize.col('updatedAt'))],
      raw: true
    });

    // Merge bill revenue
    bills.forEach(bill => {
      const dayIndex = parseInt(bill.day) - 1;
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        dailyRevenue[dayIndex].revenue += parseFloat(bill.totalRevenue || 0);
        dailyRevenue[dayIndex].billCount = parseInt(bill.billCount || 0);
      }
    });

    // Merge payment revenue
    payments.forEach(payment => {
      const dayIndex = parseInt(payment.day) - 1;
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        dailyRevenue[dayIndex].revenue += parseFloat(payment.totalRevenue || 0);
        dailyRevenue[dayIndex].reservationCount = parseInt(payment.paymentCount || 0);
      }
    });

    // Calculate total and average
    const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
    const averageRevenue = totalRevenue / daysInMonth;

    return res.status(200).json({
      message: "success",
      year: parseInt(year),
      month: parseInt(month),
      totalRevenue: Math.round(totalRevenue),
      averageRevenue: Math.round(averageRevenue),
      dailyRevenue: dailyRevenue.map(day => ({
        day: day.day,
        revenue: Math.round(day.revenue),
        billCount: day.billCount,
        reservationCount: day.reservationCount
      }))
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// /admin/report/monthly-vehicles
// GET /admin/report/monthly-vehicles?year=2025&month=11
exports.getMonthlyVehicles = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;

    // Get number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Initialize vehicle count array for each day
    const dailyVehicles = Array(daysInMonth).fill(0).map((_, index) => ({
      day: index + 1,
      totalVehicles: 0,
      cars: 0,
      motorbikes: 0
    }));

    // Count vehicles from Tickets (actual entry/exit)
    const tickets = await model.Ticket.findAll({
      attributes: [
        [sequelize.fn('DAY', sequelize.col('actual_entry')), 'day'],
        'vehicleType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'vehicleCount']
      ],
      where: {
        actual_entry: {
          [Op.between]: [
            new Date(year, month - 1, 1),
            new Date(year, month, 0, 23, 59, 59)
          ]
        }
      },
      group: [
        sequelize.fn('DAY', sequelize.col('actual_entry')),
        'vehicleType'
      ],
      raw: true
    });

    // Count vehicles from Reservations (online bookings)
    const reservations = await model.Reservation.findAll({
      attributes: [
        [sequelize.fn('DAY', sequelize.col('date')), 'day'],
        'vehicleType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'vehicleCount']
      ],
      where: {
        date: {
          [Op.between]: [
            `${year}-${String(month).padStart(2, '0')}-01`,
            `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`
          ]
        },
        status: {
          [Op.in]: ['CONFIRMED', 'CHECKIN', 'CHECKOUT']
        }
      },
      group: [
        sequelize.fn('DAY', sequelize.col('date')),
        'vehicleType'
      ],
      raw: true
    });

    // Merge ticket data
    tickets.forEach(ticket => {
      const dayIndex = parseInt(ticket.day) - 1;
      const count = parseInt(ticket.vehicleCount || 0);
      
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        dailyVehicles[dayIndex].totalVehicles += count;
        if (ticket.vehicleType === 'CAR') {
          dailyVehicles[dayIndex].cars += count;
        } else if (ticket.vehicleType === 'MOTORBIKE') {
          dailyVehicles[dayIndex].motorbikes += count;
        }
      }
    });

    // Merge reservation data
    reservations.forEach(reservation => {
      const dayIndex = parseInt(reservation.day) - 1;
      const count = parseInt(reservation.vehicleCount || 0);
      
      if (dayIndex >= 0 && dayIndex < daysInMonth) {
        dailyVehicles[dayIndex].totalVehicles += count;
        if (reservation.vehicleType === 'CAR') {
          dailyVehicles[dayIndex].cars += count;
        } else if (reservation.vehicleType === 'MOTORBIKE') {
          dailyVehicles[dayIndex].motorbikes += count;
        }
      }
    });

    // Calculate totals
    const totalVehicles = dailyVehicles.reduce((sum, day) => sum + day.totalVehicles, 0);
    const totalCars = dailyVehicles.reduce((sum, day) => sum + day.cars, 0);
    const totalMotorbikes = dailyVehicles.reduce((sum, day) => sum + day.motorbikes, 0);
    const averageVehicles = totalVehicles / daysInMonth;

    return res.status(200).json({
      message: "success",
      year: parseInt(year),
      month: parseInt(month),
      summary: {
        totalVehicles,
        totalCars,
        totalMotorbikes,
        averageVehicles: Math.round(averageVehicles * 100) / 100
      },
      dailyVehicles: dailyVehicles
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// /admin/report/vehicle-ratio
// GET /admin/report/vehicle-ratio?year=2025&month=11
// Or GET /admin/report/vehicle-ratio?startDate=2025-01-01&endDate=2025-12-31 (for custom range)
exports.getVehicleRatio = async (req, res, next) => {
  try {
    let startDate, endDate;
    let periodLabel;

    if (req.query.startDate && req.query.endDate) {
      // Custom date range
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
      periodLabel = `${req.query.startDate} to ${req.query.endDate}`;
    } else {
      // Monthly (default to current month)
      const year = req.query.year || new Date().getFullYear();
      const month = req.query.month || new Date().getMonth() + 1;
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      periodLabel = `${year}-${String(month).padStart(2, '0')}`;
    }

    // Count vehicles from Tickets
    const ticketCounts = await model.Ticket.findAll({
      attributes: [
        'vehicleType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        actual_entry: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['vehicleType'],
      raw: true
    });

    // Count vehicles from Reservations
    const reservationCounts = await model.Reservation.findAll({
      attributes: [
        'vehicleType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        date: {
          [Op.between]: [
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          ]
        },
        status: {
          [Op.in]: ['CONFIRMED', 'CHECKIN', 'CHECKOUT']
        }
      },
      group: ['vehicleType'],
      raw: true
    });

    // Initialize counts
    let carCount = 0;
    let motorbikeCount = 0;

    // Sum from tickets
    ticketCounts.forEach(ticket => {
      const count = parseInt(ticket.count || 0);
      if (ticket.vehicleType === 'CAR') {
        carCount += count;
      } else if (ticket.vehicleType === 'MOTORBIKE') {
        motorbikeCount += count;
      }
    });

    // Sum from reservations
    reservationCounts.forEach(reservation => {
      const count = parseInt(reservation.count || 0);
      if (reservation.vehicleType === 'CAR') {
        carCount += count;
      } else if (reservation.vehicleType === 'MOTORBIKE') {
        motorbikeCount += count;
      }
    });

    const totalVehicles = carCount + motorbikeCount;

    // Calculate percentages
    const carPercentage = totalVehicles > 0 ? (carCount / totalVehicles * 100) : 0;
    const motorbikePercentage = totalVehicles > 0 ? (motorbikeCount / totalVehicles * 100) : 0;

    return res.status(200).json({
      message: "success",
      period: periodLabel,
      totalVehicles,
      vehicleRatio: {
        cars: {
          count: carCount,
          percentage: Math.round(carPercentage * 100) / 100
        },
        motorbikes: {
          count: motorbikeCount,
          percentage: Math.round(motorbikePercentage * 100) / 100
        }
      },
      // Data formatted for pie/donut charts
      chartData: [
        {
          label: 'Ô tô',
          value: carCount,
          percentage: Math.round(carPercentage * 100) / 100,
          color: '#007bff'
        },
        {
          label: 'Xe máy',
          value: motorbikeCount,
          percentage: Math.round(motorbikePercentage * 100) / 100,
          color: '#28a745'
        }
      ]
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};




