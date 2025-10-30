const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// admin/login
exports.postLogin = async(req, res, next) => {
  const {username, password} = req.body;  
  const admin = await model.Staff.findOne({
    where: {username, role: "admin"},
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
          model: model.ParkingFee,
          attributes: ['id', 'spot_type', 'is_active']
        }
      ],
      order: [['id', 'ASC']]
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
  const { spot_type } = req.body;

  if (!spot_type) {
    return res.status(400).json({ message: "Loại chỗ đỗ là bắt buộc" });
  }

  if (!['CAR', 'MOTORBIKE'].includes(spot_type)) {
    return res.status(400).json({ message: "Loại chỗ đỗ phải là CAR hoặc MOTORBIKE" });
  }

  try {
    const spot = await model.Spot.create({
      spot_type,
      is_active: true
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

// admin/deleteSpot
exports.deleteSpot = async (req, res) => {
  const { id } = req.params;

  try {
    const spot = await model.Spot.findByPk(id);

    if (!spot) {
      return res.status(404).json({ message: "Chỗ đỗ không tồn tại" });
    }

    // Check if spot is occupied (using is_active instead of status)
    if (!spot.is_active) {
      return res.status(400).json({ message: "Chỗ đỗ đã bị vô hiệu hóa" });
    }

    await spot.destroy();

    res.status(200).json({ message: "Xóa chỗ đỗ thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.getRole = async(req, res, next) => {
  const token = req.headers['authorization'];
  if(token){
    const check = await jwt.verify(token, process.env.SECRET_KEY);
    if(check.role === 'admin') res.status(200).json({
      message: "hello admin"
    })
    else res.status(404).json({
      message: "bạn không phải là admin"
    })
  }
}