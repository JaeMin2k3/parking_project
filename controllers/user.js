const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
require('dotenv').config();

exports.postLogin = async (req, res, next) => {
  const {username, password} = req.body;
  console.log(username + password)
  if(!username || !password) return res.status(400).json({message: 'vui lòng điền đủ username và password'});
  try{
    const user = await model.Customer.findOne(
    {
      where: {username},
      attributes: ['username', "password_hash"],
      raw: true
    })
    console.log(user)
    //check username
    if(user){
    const ok = await bcrypt.compare(password, user.password_hash);
    // check mặt khẩu
    if(ok){
      jwt.sign({_id: user.username}, process.env.SECRET_KEY, {expiresIn: '24h'},
         (err, token) => {
          if(err){
            console.log(err);
            res.status(500).send(err);
          }else {
            res.status(200).json({
              message: "success",
              token: token
            })
          }
         }
      )
    }else{
      res.status(401).send('mật khẩu không đúng');
    }
  }else {
    res.status(401).json("tài khoản không tồn tại")
  }
    
  }catch(err){
    console.log(err);
  }   
}


exports.postSign = async (req, res, next) => {
  const {username, password} = req.body;
  console.log(username + password)
  const user = await model.Customer.findOne({
    where: {username},
    raw: true
  })
  console.log(user)
  if(user) return res.status(409).json({message: "username đã tồn tại"})
  else {
    const pw_hash = bcrypt.hashSync(password, 10);
    const created = await model.Customer.create({
      username: username,
      password_hash: pw_hash,
      role: 'customer',
      status: 1
    });
    res.status(200).json({message: "tạo tài khoản thành công"})
  }
  
}

// user/available-spots
exports.getAvailableSpots = async (req, res, next) => {
  const { spot_type, start_time, end_time } = req.body;

  // Validate input
  if (!spot_type || !start_time || !end_time) {
    return res.status(400).json({ 
      message: "Vui lòng cung cấp đầy đủ: spot_type, start_time, end_time" 
    });
  }

  if (!['CAR', 'MOTORBIKE'].includes(spot_type)) {
    return res.status(400).json({ 
      message: "spot_type phải là CAR hoặc MOTORBIKE" 
    });
  }

  // Validate time range
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ 
      message: "Định dạng thời gian không hợp lệ" 
    });
  }

  if (endDate <= startDate) {
    return res.status(400).json({ 
      message: "Thời gian kết thúc phải sau thời gian bắt đầu" 
    });
  }

  try {
    // Find all active spots of the requested type
    const spots = await model.Spot.findAll({
      where: {
        spot_type: spot_type,
        is_active: true
      },
      include: [
        {
          model: model.ParkingFee,
          attributes: ['plan_type', 'unit_price', 'currency', 'vehicle_type']
        }
      ]
    });

    if (spots.length === 0) {
      return res.status(404).json({
        message: "Không tìm thấy chỗ đỗ phù hợp",
        available_spots: []
      });
    }

    // Get all reservations that conflict with the requested time range
    const conflictingReservations = await model.Reservation.findAll({
      where: {
        status: {
          [Op.in]: ['PENDING_PAYMENT', 'CONFIRMED']
        },
        [Op.or]: [
          {
            // Reservation starts during requested period
            start_time: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            // Reservation ends during requested period
            end_time: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            // Reservation encompasses the entire requested period
            [Op.and]: [
              { start_time: { [Op.lte]: startDate } },
              { end_time: { [Op.gte]: endDate } }
            ]
          }
        ]
      },
      attributes: ['spot_id'],
      raw: true
    });

    // Get list of occupied spot IDs
    const occupiedSpotIds = conflictingReservations.map(r => r.spot_id);

    // Filter out occupied spots
    const availableSpots = spots.filter(spot => !occupiedSpotIds.includes(spot.id));

    res.status(200).json({
      message: "success",
      requested_period: {
        start_time: startDate,
        end_time: endDate,
        spot_type: spot_type
      },
      total_spots: spots.length,
      occupied_spots: occupiedSpotIds.length,
      available_count: availableSpots.length,
      available_spots: availableSpots
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: "Lỗi server", 
      error: err.message 
    });
  }
}
