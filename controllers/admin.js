const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');
require('dotenv').config();
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
      message: "tài khoản không tồn tại"
    }
  )
}

//admin/staffs
exports.getAllStaffs = async (req,res, next) => {
  try{
      const staffs = await model.Staff.findAll({
      where: {
        role: "staff"
      },
      attributes: ["name", "date","username", "status", "createdAt"],
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
    const staff = await model.Staff.findOne({where: {
      username: username
    }})
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

  try {
    const ok = await model.Staff.destroy({
      where: {
        username: id
      }, transaction
    });
    if(!ok) {
      await transaction.rollback();
      return res.status(404).json({message: "tài khoản này không được tìm thấy"});
    }
    await transaction.commit();
    res.status(200).json({message: "xoá nhân viên thành công"})
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return res.status(500).json({message: "server bị lỗi"});
  }
}
// admin/edit/:idStaff
exports.postEditStaff = async(req,res,next) => {
  const id = req.params.idStaff;
  const {name, date, pw} = req.body;
  if(!name || !date || !pw) return res.status(400).json({message: "vui lòng điển đầy đủ các trường thông tin"});
  const pw_hash = bcrypt.hashSync(pw, 10);
  const transaction = await sequelize.transaction();
  try {
    const ok = await model.Staff.update(
    {
      name: name,
      date: date,
      password_hash: pw_hash
    },
    {
      where: {username: id}, transaction
    });
    if(ok[0] === 0){
      await transaction.rollback();
      return res.status(404).json({message: "username không tồn tại"})
    }

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
      where: {username: username}
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
const now = new Date();
const currentDate = now.toLocaleDateString('sv-SE');
const hour = now.getHours();
const mapStatus = await model.Spot.findAll({
  attributes: ['id', 'area', 'position', 'vehicleType', 'isActive'],
  include: [
    {
      model: model.ReservationBlock,
      required: false,
      where: {
        date: currentDate,
        blockIndex: hour
      },
      include: [
        {
          model: model.Reservation,
          attributes: ['status', 'plate', 'channel']
        }
      ]
    }
  ]
})
// ... Sau khi chạy xong câu lệnh const mapStatus = await model.Spot.findAll(...)

// BƯỚC XỬ LÝ: Biến đổi dữ liệu cho gọn nhẹ
const formattedData = mapStatus.map(spot => {
    // 1. Lấy thông tin đặt chỗ (nếu có)
    // Vì ta đã filter theo giờ nên mảng ReservationBlocks chỉ có tối đa 1 phần tử
    const bookingInfo = spot.ReservationBlocks && spot.ReservationBlocks[0];
    const reservation = bookingInfo ? bookingInfo.Reservation : null;

    // 2. Thiết lập mặc định là TRỐNG
    let statusText = 'AVAILABLE';
    let colorCode = '#28a745'; // Màu xanh lá (Bootstrap success)
    let plateNumber = null;
    let customerType = 'NONE'; // Khách vãng lai hay Online

    // 3. Logic kiểm tra trạng thái
    if (reservation) {
        // --- TRƯỜNG HỢP CÓ KHÁCH ONLINE ---
        plateNumber = reservation.plate;
        customerType = 'ONLINE';

        if (reservation.status === 'CONFIRMED') {
            statusText = 'BOOKED'; // Đã đặt - Chờ đến
            colorCode = '#ffc107'; // Màu vàng (Bootstrap warning)
        } else if (reservation.status === 'CHECKIN') {
            statusText = 'OCCUPIED'; // Đang đỗ
            colorCode = '#dc3545'; // Màu đỏ (Bootstrap danger)
        }
    } else {
        // --- TRƯỜNG HỢP KHÔNG CÓ ONLINE -> CHECK OFFLINE ---
        // Nếu isActive = false (hoặc 0) nghĩa là đang có xe vãng lai chiếm chỗ
        if (!spot.isActive) {
             statusText = 'OCCUPIED';
             colorCode = '#dc3545'; // Màu đỏ
        }
    }

    // 4. Trả về object gọn gàng
    return {
        id: spot.id,
        area: spot.area,
        position: spot.position,
        vehicleType: spot.vehicleType, // CAR hoặc MOTORBIKE (để hiện icon)
        status: statusText,            // AVAILABLE / BOOKED / OCCUPIED
        color: colorCode,              // Mã màu hex để tô nền
        plate: plateNumber,            // Biển số (nếu có)
        channel: customerType     // ONLINE / OFFLINE / NONE
    };
});

// Trả về kết quả đã làm đẹp
res.status(200).json({
    message: "success",
    mapStatus: formattedData
});

}

