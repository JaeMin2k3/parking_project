const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const TokenVerify = require('../util/jwt')
require('dotenv').config();
// admin/login
exports.postLogin = async(req, res, next) => {
  const {username, password} = req.body;  
  const admin = await model.Staff.findOne({
    where: {username},
    attribute: ["username", "password_hash", "role"],
    raw: true
  })

  if(admin){ 
    console.log(admin);
    const oke =  await bcrypt.compare(password, admin.password_hash);
    if(oke){
      jwt.sign({_id: admin.username,  role: admin.role}, process.env.SECRET_KEY, {expiresIn: "24h"},
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
  const staffs = await model.Staff.findAll({
    where: {
      role: "staff"
    },
    attribute: ["username", "password"],
    raw: true
  });

  if(staffs){
    res.status(200).json({
      message: "success",
      staffs: staffs
    })
  }else{
    res.status(404).json({
      message: "không có tài khoản nhân viên nào"
    })
  }
}

// admin/newStaff
exports.postNewStaff = async (req,res,next) => {
  const {username, password} = req.body;
  console.log(username + "+" + password);
  const pw_hash = await bcrypt.hashSync(password, 10);
  console.log(pw_hash)
  await model.Staff.create({
    username: username,
    password_hash: pw_hash,
    role: 'staff',
    status: 1
  })
  res.status(200).json({
    message: 'success'
  })
} 

// admin/spots
exports.getAllSpots = async (req, res) => {
  try {
    const spots = await model.Spot.findAll({
      include: [
        {
          model: model.ParkingRate,
          attributes: ['plan_type', 'unit_price', 'currency', 'vehicle_type']
        }
      ],
      order: [['spot_number', 'ASC']]
    });

    res.status(200).json({
      message: "success",
      count: spots.length,
      spots: spots
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// admin/newSpot
exports.postNewSpot = async (req, res) => {
  const { spot_number, area, vehicle_type, parkingFeeId } = req.body;

  if (!spot_number || !vehicle_type) {
    return res.status(400).json({ message: "Số chỗ và loại xe là bắt buộc" });
  }

  try {
    // Check if spot number already exists
    const existing = await model.Spot.findOne({
      where: { spot_number },
      raw: true
    });

    if (existing) {
      return res.status(409).json({ message: "Số chỗ đã tồn tại" });
    }

    const spot = await model.Spot.create({
      spot_number,
      area: area || null,
      vehicle_type,
      status: 'AVAILABLE',
      parkingFeeId: parkingFeeId || null
    });

    res.status(201).json({
      message: "Tạo chỗ đỗ thành công",
      spot: spot
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// admin/updateSpot
exports.postUpdateSpot = async (req,res,next) => {
  const {username, password, status} = req.body;
  console.log(username + " " + password + " "+status)
  const pw_hash = bcrypt.hashSync(password, 10);
  console.log(pw_hash);
  const check = await model.Staff.update(
    {
      password_hash: pw_hash,
      status: status
    },
    {
      where: {username},
    }
  )
  console.log(check)
  if(check) res.status(200).json({
    message: "cập nhật thành công"
  })
  else{
    res.status(500).json({
      message: "cập nhật thất bại, vui lòng thử lại sau"
    })
  }
  }

// admin/deleteSpot
exports.deleteSpot = async (req, res) => {
  const { id } = req.params;

  try {
    const spot = await model.Spot.findByPk(id);

    if (!spot) {
      return res.status(404).json({ message: "Chỗ đỗ không tồn tại" });
    }

    // Check if spot is occupied
    if (spot.status === 'OCCUPIED') {
      return res.status(400).json({ message: "Không thể xóa chỗ đang có xe" });
    }

    await spot.destroy();

    res.status(200).json({ message: "Xóa chỗ đỗ thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
