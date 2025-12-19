const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op, col } = require('sequelize');
require('dotenv').config();
const crypto = require('crypto');
const { mailer } = require('../config/mailer');
const sequelize = require('../config/database');

const isSlotAvailable = require('../helper/isSlotAvailable');
const createBlocksFromReservation = require('../helper/createBlocksFromReservation');
const moment = require('moment-timezone');
const vnpay = require('../config/vnpay');
const { VnpLocale, dateFormat, ProductCode } = require('vnpay'); 
const createAndSendVerifyLink = require('../helper/createAndSendVerifyLink');

const findAvailableSpotOnline = require('../helper/findAvailableSpotOnline');
// user/login
exports.postLogin = async (req, res, next) => {
  const {username, password} = req.body;
  console.log(username + password)
  if(!username || !password) return res.status(400).json({message: 'vui lòng điền đủ username và password'});
  try{
    const user = await model.Customer.findOne(
    {
      where: {username},
      attributes: ['username', "password_hash", "role"],
      raw: true
    })
    console.log(user)
    //check username
    if(user){
    const ok = await bcrypt.compare(password, user.password_hash);
    // check mặt khẩu
    if(ok){
      jwt.sign({id: user.username,role: user.role}, process.env.SECRET_KEY, {expiresIn: '24h'},
         (err, token) => {
          if(err){
            console.log(err);
            res.status(500).send(err);
          }else {
            res.status(200).json({
              message: "success",
              token: token,
              role: user.role
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


// user/signup
exports.postSign = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { username, password, gmail } = req.body;
    if (!username || !password || !gmail) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Thiếu username/password/gmail' });
    }
    const email = String(gmail).trim().toLowerCase();

    // check tài khoản
    const existed = await model.Customer.findOne({
      where: { [Op.or]: [{ username: username.trim() }, { gmail: email }] },
      attributes: ['username','gmail'],
      raw: true
    });
    if (existed){
      await transaction.rollback();
     return res.status(409).json({ message: 'Username hoặc gmail đã tồn tại' });
    }
    let verifyLink;
      const password_hash = await bcrypt.hash(password, 10);
      const user = await model.Customer.create({
        username: username,
        password_hash,
        gmail: email,
        role: 'customer',
        status: 1,
        verified: false
      }, { transaction });

      
      await model.UserVerify.destroy({ where: { gmailCustomer: email, usedAt: null }, transaction });

      const rawToken  = crypto.randomBytes(4).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await model.UserVerify.create({ gmailCustomer: email, tokenHash, expiresAt }, { transaction});

    
      verifyLink = `${process.env.APP_BASE_URL}/verify-email/${encodeURIComponent(rawToken)}`;
      transaction.commit();
      transaction.afterCommit(async () => {
        await mailer.sendMail({
          to: email,
          from: process.env.GMAIL_USER,
          subject: 'Xác minh email',
          html: `
            <p>Chào ${user.username},</p>
            <p>Nhấn vào link sau để xác minh email (hết hạn trong 30 phút):</p>
            <p><a href="${verifyLink}">${verifyLink}</a></p>
          `
        });
      });
    return res.status(200).json({ message: 'Tạo tài khoản thành công. Kiểm tra email để xác minh.' });
  } catch (err) {
    console.error(err);
    await transaction.rollback();
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};


// /user/resend-verify
exports.postResendVerify = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { gmail } = req.body || {};
    console.log(gmail)
    if (!gmail) {
      await transaction.rollback();
      return res.status(400).json({ error: 'vui lòng nhập gmail' });
    }
    const user = await model.Customer.findOne({ where: { gmail: String(gmail).toLowerCase() } });
    console.log(user)
    if (!user){
      await transaction.rollback();
      return res.status(404).json({ error: 'User không tồn tại' });
    }
    if (user.verified){
      await transaction.rollback();
      return res.status(400).json({ error: 'User đã xác minh' });
    }
    await createAndSendVerifyLink(user, transaction);
    await transaction.commit()
    return res.json({ ok: true, message: 'Đã gửi lại email xác minh' });
  } catch (err) {
    console.log(err);
    await transaction.rollback(); 
    next(err); 
  }
};



//  tự động POST token lên API
exports.verifyEmailBridge = (req, res) => {
  const token  = encodeURIComponent(String(req.params.token || ''));
  const action = `${process.env.APP_BASE_URL}/verify-email`; 

  res.set('Content-Type','text/html; charset=utf-8').send(
    `<!doctype html>
      <meta charset="utf-8"><title>Verifying…</title>
      <div>
        <div class="s"></div><p>Đang xác minh…</p>
        <form id="f" method="POST" action="${action}">
        <input type="hidden" name="token" value="${token}">
        </form>
        <script>document.getElementById('f').submit()</script>
      </div>`
    );
};


// /user/verify-email
exports.postVerifyEmail = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const raw = String(req.body.token || '');
    if (!raw) {
      await transaction.rollback();
      return res.status(400).send('Thiếu token');
    }
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const rec = await model.UserVerify.findOne({ where: { tokenHash: hash } });
    if (!rec) return res.status(400).send('Token không hợp lệ');
    if (rec.usedAt) return res.status(400).send('Token đã được sử dụng');
    if (rec.expiresAt.getTime() < Date.now()) return res.status(400).send('Token đã hết hạn');
    Promise.all([ 
      await model.Customer.update(
        { verified: true },
        { where: { gmail: rec.gmailCustomer }, transaction: transaction }
      ),
      await model.UserVerify.update(
        { usedAt: new Date() },
        { where: { id: rec.id }, transaction: transaction }
      ),
      await model.UserVerify.destroy({
        where: { gmailCustomer: rec.gmailCustomer, usedAt: null },
        transaction: transaction
      })
    ])  
    transaction.commit();
    return res.send('Xác minh email thành công!');
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    return next(error);
  }
};

// /user/infor
exports.getInfor = async (req,res,next) =>{
  const user = await model.Customer.findByPk(
    req.username,{attributes: ['username', 'gmail', 'role', 'verified', 'status']}
    
  );

  if(!user) return res.status(404).json({message: "user không tồn tại"});
  return res.status(200).json({
    message: "success",
    user: user
  })
}

exports.postBarCode = async(req,res,next) => {
  const gmail = req.body.gmail;
  console.log(gmail)
  if(!gmail) res.status(400).json({message: "vui lòng nhập gmail"})
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30* 60 * 1000);
  const transaction = await sequelize.transaction();
  try {
    const checkCustomer = await model.Customer.findOne({where: {
      gmail: gmail,
      role: 'customer'
    },transaction})
    if(!checkCustomer) res.status(404).json({message: "gmail bị lỗi"});
    await model.UserReset.destroy({where:{
      gmail: gmail,
    }, transaction})
    const checkUserReset = await model.UserReset.create({
      tokenHash: tokenHash,
      expiresAt: expiresAt,
      gmail: gmail,
      useAt: null
    }, {transaction});
    if(!checkUserReset){
      await transaction.rollback();
      res.status(500).json({message: "lỗi server không thể tạo được barcode"})
    }
    await transaction.commit();
    await mailer.sendMail({
      to: gmail,
      from: process.env.GMAIL_USER,
      subject: 'Reset Password',
      html: `
        <p>Xin chào bạn, rất vui khi bạn đã tin tưởng và sử dụng website của chúng tôi</P>
        <p>Barcode để reset password của bạn là: ${rawToken}
        `
    });
    res.status(200).json({message: "success"})
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    next(error);
  }
  
}

exports.postForgetPw = async(req, res, next) => {
  const gmail = req.body.gmail;
  const rawToken = req.body.token;
  const pw = req.body.password;
  if(!gmail || !rawToken || !pw){
    res.status(400).json({message: "vui lòng nhập đủ các trường dữ liệu"})
  }
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const check = await model.UserReset.findOne({where: {
    gmail: gmail,
    tokenHash: tokenHash
  }});
  if(!check) res.status(400).json({
    message: "gmail hoặc barcode của bạn đang bị sai"
  });
  console.log(check);
  const pw_hash = bcrypt.hashSync(pw, 10);
  console.log(check.expiresAt);
  console.log(check.useAt)
  if(!check.useAt && check.expiresAt >= Date.now() ){
    await model.UserReset.update({
      useAt: new Date()
    },{where: 
      {
        gmail: gmail
      }})
    const newCustomer = await model.Customer.update({
    password_hash: pw_hash
  },{
    where: {
      gmail: gmail
    }
  })
  if(!newCustomer) res.status(500).json({message: "lỗi server không thể thay đổi mật khẩu"});
  return res.status(200).json({message: "thay đổi mật khẩu thành công"})
  }else 
    return res.status(404).json({message: "token đã hết hạn"})
}

// /user/parking-lot/available

exports.postAvailableSlot = async (req, res, next) => {
  try {
    const {timeIn, timeOut, dateTimeIn, dateTimeOut, vehicleType} = req.body;
  
  // Validate input
  if (timeIn === undefined || timeOut === undefined || !dateTimeIn || !dateTimeOut || !vehicleType) {
    return res.status(400).json({ message: "vui lòng gửi đủ trường dữ liệu" });
  }
  
  const startBlock = Number(timeIn);
  const endBlock = Number(timeOut);
  
  if (!Number.isInteger(startBlock) || !Number.isInteger(endBlock)) {
    return res.status(400).json({ message: "Giờ phải là số nguyên" });
  }
  
  if (startBlock < 0 || startBlock > 23 || endBlock > 23 || endBlock < 0) {
    return res.status(400).json({ message: "giờ phải nằm trong khoảng từ 0 đến 23" });
  }
  
  const startTime = moment.tz(dateTimeIn, "Asia/Ho_Chi_Minh") .hour(timeIn).minute(0).second(0);
  const endTime = moment.tz(dateTimeOut, "Asia/Ho_Chi_Minh").hour(timeOut).minute(0).second(0);
  console.log(startTime, endTime)
  const now =  moment().tz("Asia/Ho_Chi_Minh");
  console.log(now);
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const ONE_Hour = 60 * 60 * 1000;

  if(startTime - now < ONE_Hour*48) {
    return res.status(400).json({message: "thời gian đặt chỗ với thời gian đăt phải cách nhau tối thiểu 48h"});
  }

  const diffMs = endTime - startTime;
   if(diffMs > ONE_DAY || diffMs < ONE_Hour){
    return res.status(400).json({message: "bạn không thể đặt chỗ quá 24h và phải chỗ ít nhất 1h"})
  }

  let isOverNight= false;
  if (dateTimeIn !== dateTimeOut) {
      isOverNight = true;
  }
  const blockWhereCondition = {
      status: { [Op.in]: ['CONFIRMED', 'PENDING'] }
  };
  if (!isOverNight) {
      // TRƯỜNG HỢP 1: Trong ngày
      blockWhereCondition.date = dateTimeIn;
      blockWhereCondition.blockIndex = { [Op.between]: [startBlock, endBlock - 1] };
  } else {
      // TRƯỜNG HỢP 2: Qua đêm 
      const orConditions = [
          {
              date: dateTimeIn,
              blockIndex: { [Op.between]: [startBlock, 23] } 
          }
      ];
      
      // Chỉ check ngày hôm sau nếu giờ ra > 0
      if (endBlock > 0) {
          orConditions.push({
              date: dateTimeOut,
              blockIndex: { [Op.between]: [0, endBlock - 1] } // Từ 0h đến giờ ra
          });
      }
      
      blockWhereCondition[Op.or] = orConditions;
  }
  const freeSpots = await model.Spot.findAll({
    limit: 10,       
    subQuery: false,
    attributes: ['id', 'area', 'position', 'status', 'vehicleType', 'slotType'],
    where: {
      status: true,
      isActive: true,
      vehicleType: vehicleType,
      slotType: 'ONLINE',
      '$ReservationBlocks.id$': null // chỉ lấy spot không bận 
    },
   
    paranoid: true, 
    include: [
      {
        model: model.ReservationBlock,
        required: false,
        where: blockWhereCondition
      }
    ],
  });
if(!freeSpots) return res.status(404).json({
  message: "no found",
  freeSpots: [],
})
  return res.status(200).json({
    freeSpots: freeSpots,
    timeIn: timeIn,
    timeOut: timeOut,
    dateTimeIn: dateTimeIn,
    dateTimeOut: dateTimeOut,
    vehicleType: vehicleType
  })
  
}
  catch (error) {
    console.log(error)
  }
  
}
// /user/reservation
exports.postReservation = async (req, res, next) => {
  const {id, timeIn, timeOut, dateTimeIn, dateTimeOut, vehicleType, plate} = req.body;
  console.log(id, timeIn, timeOut, dateTimeIn, dateTimeOut, vehicleType, plate)
  // Validate input
  if (timeIn === undefined || timeOut === undefined || !dateTimeIn || !dateTimeOut || !vehicleType) {
    return res.status(400).json({ message: "vui lòng gửi đủ trường dữ liệu" });
  }
  
  const startBlock = Number(timeIn);
  const endBlock = Number(timeOut);
  
  if (!Number.isInteger(startBlock) || !Number.isInteger(endBlock)) {
    return res.status(400).json({ message: "Giờ phải là số nguyên" });
  }
  
  if (startBlock < 0 || startBlock > 23 || endBlock > 23 || endBlock < 0) {
    return res.status(400).json({ message: "giờ phải nằm trong khoảng từ 0 đến 23" });
  }
  
  const startTime = moment.tz(dateTimeIn, "Asia/Ho_Chi_Minh") .hour(timeIn).minute(0).second(0);
  const endTime = moment.tz(dateTimeOut, "Asia/Ho_Chi_Minh").hour(timeOut).minute(0).second(0);

  const now =  moment().tz("Asia/Ho_Chi_Minh");
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const ONE_Hour = 60 * 60 * 1000;

  if(startTime - now < ONE_DAY*2) {
    return res.status(400).json({message: "thời gian đặt phải cách ngày đặt là 2 ngày"});
  }

  const diffMs = endTime - startTime;
   if(diffMs > ONE_DAY || diffMs < ONE_Hour){
    return res.status(400).json({message: "bạn không thể đặt chỗ quá 24h và phải chỗ ít nhất 1h"})
  }
  
  let isOverNight = false;
  if (dateTimeIn.trim() !== dateTimeOut.trim()) {
      isOverNight = true;
  }
  let blockCount = 0;
  if(isOverNight){
    blockCount = 24 - startBlock + endBlock;
  }else{
    blockCount = endBlock - startBlock;
  }
  const transaction = await sequelize.transaction();
  try {
    const check = await isSlotAvailable(id, dateTimeIn, dateTimeOut, startBlock, endBlock, plate, vehicleType);
    if(!check){
      await transaction.rollback();
      return res.status(409).json({ 
        message: `trùng thời gian trong khoảng ${timeIn}:00 - ${timeOut}:00` 
      });
    }
    console.log(check);
    const reservation = await model.Reservation.create({
      dateIn: startTime,
      dateOut: endTime,
      startBlock: startBlock,
      blockCount: blockCount,
      status: 'PENDING',
      channel: 'ONLINE',
      plate: plate,
      vehicleType: vehicleType,
      user_id: req.username,
      spotId: id,
      isOverNight: isOverNight
    },{transaction})
    console.log(reservation);
    if(!reservation){
      await transaction.rollback();
      return res.status(500).json({message: "lỗi server không thể tạo được reservation"});
    }
    await createBlocksFromReservation(reservation, dateTimeIn, dateTimeOut, transaction, plate, vehicleType);
    await transaction.commit();
    return res.status(200).json({ 
      message: `Đặt chỗ thành công từ ${startTime} - ${endTime}`,
      reservation: {
        id: reservation.id,
        date: reservation.date,
        timeRange: `${startTime} - ${endTime}:00`,
        blockCount: reservation.blockCount,
        plate: reservation.plate,
        vehicleType: reservation.vehicleType,
        status: reservation.status
      }
    });
  } catch (error) {
    console.log(error)
    await transaction.rollback();
    return res.status(500).json({message: 'lỗi server vui long thử lại sau'})
  }
}

// user/payment/vnpay/create
exports.postCreateVnpayPayment = async (req, res, next) => {
  const { reservationId } = req.body;
  if (!reservationId) {
    return res.status(400).json({ message: 'chưa gửi reservationId' });
  }

  // xoá hết payment trc đã tạo
  await model.Payment.destroy({where: {
    reservationId: reservationId,
    status: "PENDING"
  }})

  const t = await sequelize.transaction();
  try {
    // 1. Lấy reservation đang PENDING
    const reservation = await model.Reservation.findOne({
      where: { id: reservationId, status: 'PENDING' },
      transaction: t,
      lock: t.LOCK.UPDATE, 
    });

    if (!reservation) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: 'reservation không tồn tại hoặc không ở trạng thái PENDING' });
    }

    //Tính tiền dựa trên ParkingRate
    const blockCount = reservation.blockCount;

    const rate = await model.ParkingRate.findOne({
      where: { vehicleType: reservation.vehicleType },
      transaction: t,
    });

    if (!rate) {
      await t.rollback();
      return res.status(500).json({ message: 'Không tìm thấy bảng giá cho loại xe này' });
    }

    const unitPrice = Number(rate.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      await t.rollback();
      return res.status(500).json({ message: 'Đơn giá không hợp lệ' });
    }

    const amount = blockCount * unitPrice; // số tiền VND (ví dụ 30000)

    // Tạo mã vnp_TxnRef riêng cho mỗi payment
    const vnp_TxnRef = `RES${reservation.id}${Date.now()}`;

    // 4. Tạo bản ghi payment
    const payment = await model.Payment.create(
      {
        reservationId,
        costParking: amount,
        currency: 'VND',
        status: 'PENDING',
        vnpTxnRef: vnp_TxnRef,
      },
      { transaction: t }
    );

    await t.commit();

    const now = new Date();
    const vnp_Amount = amount;
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: vnp_Amount, 
      vnp_IpAddr: '127.0.0.1',
      vnp_TxnRef: vnp_TxnRef,
      vnp_OrderInfo: `${reservation.id}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: process.env.VNP_RETURNURL,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(new Date(now.getTime() + 15 * 60 * 1000))
    });

    console.log('paymentUrl:', paymentUrl);
    

    return res.status(200).json({
      reservationId: reservation.id,
      paymentId: payment.id,
      amount,
      vnpayUrl: paymentUrl,
    });
  } catch (error) {
    console.error(error);
    await t.rollback();
    return res.status(500).json({ message: 'Lỗi server khi tạo thanh toán VNPAY' });
  }
};




exports.vnpayIpn = async (req, res) => {
  // VNPAY gọi vào đây với method GET và các tham số trên URL (req.query)
  try {
    // Xác thực chữ ký (Checksum) - Bảo mật
    const verify = vnpay.verifyIpnCall(req.query);
    console.log(req.query);
    if (!verify.isSuccess) {
      return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
    }

    // Lấy dữ liệu từ VNPAY
    const vnp_TxnRef = req.query.vnp_TxnRef;       // Mã tham chiếu (khớp với create)
    const vnp_Amount = req.query.vnp_Amount;       // Số tiền * 100
    const vnp_ResponseCode = req.query.vnp_ResponseCode; 
    console.log(vnp_ResponseCode);
    const payment = await model.Payment.findOne({
      where: { vnpTxnRef: vnp_TxnRef },
    });

    if (!payment) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    // Kiểm tra số tiền 
    if (Number(payment.costParking) !== Number(vnp_Amount/100)) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // 6. Kiểm tra xem đơn này đã xử lý chưa (Chống trùng lặp)
    if (payment.status === 'SUCCEEDED' || payment.status === 'FAILED') {
      return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    const t = await sequelize.transaction();

    try {
      if (vnp_ResponseCode === '00') {
       Promise.all([
        await model.Payment.update({status: 'SUCCEEDED'},{where: {reservationId: payment.reservationId}, t}),
        await model.Reservation.update({status: 'CONFIRMED'},{where: {id: payment.reservationId}, t}),
        await model.ReservationBlock.update(
          { status: 'CONFIRMED' },
          {
            where: {
              reservationId: payment.reservationId,
              status: 'PENDING'
            },
            transaction: t
          }
        )
       ])

        await t.commit(); 
        return res.status(200).json({ RspCode: '00', Message: 'Success' });

      } else {
        Promise.all([
        await model.Payment.update({status: 'FAILED'},{where: {reservationId: payment.reservationId}, t}),
        await model.Reservation.update({status: 'CANCELLED'},{where: {id: payment.reservationId}, t}),
        await model.ReservationBlock.update(
          { status: 'CANCELLED' },
          {
            where: {
              reservationId: { [Op.in]: payment.reservationId },
              status: 'PENDING'
            },
            transaction: t
          }
        )
       ])

        await t.commit();
        return res.status(200).json({ RspCode: '00', Message: 'Success' });
      }
    } catch (dbError) {
      await t.rollback();
      console.error('Database Transaction Error:', dbError);
      return res.status(200).json({ RspCode: '99', Message: 'Unknow error' });
    }

  } catch (error) {
    console.error('VNPAY IPN Error:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknow error' });
  }
};

const io = require('../socket');

// /user/parking/status
exports.getAllSlotStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
  // đếm slot hiện tại
  const [carNumbers, motorNumbers, onlineCarSlots, onlineMotorSlots] = await Promise.all([
    model.Spot.count({
    where: {
      vehicleType: 'CAR',
      slotType: 'OFFLINE',
      isActive: true,
      status: true
    }
  }),
    model.Spot.count({
    where: {
      vehicleType: 'MOTORBIKE',
      slotType: 'OFFLINE',
      isActive: true,
      status: true
    }
  }), 
     findAvailableSpotOnline('CAR', 'ONLINE', transaction),
     findAvailableSpotOnline('MOTORBIKE', 'ONLINE', transaction),
  ])
  
  await transaction.commit();
  io.getIO().emit('slotStatus', {
    action: 'updateStatus',
    data: {
      carNumbers: carNumbers + onlineCarSlots.length,
      motorNumbers: motorNumbers + onlineMotorSlots.length
    }
    
  })
  
  return res.status(200).json({
    message: "success",
     carNumbers: carNumbers + onlineCarSlots.length,
      motorNumbers: motorNumbers + onlineMotorSlots.length
  })
  } catch (error) {
    console.log(error);
    await transaction.rollback();
  }
}

exports.getActiveReservationNumbers = async (req, res, next) => {
  const numbers = await model.Reservation.count({where: {
    status: "CONFIRMED"
  }})
  return res.status(200).json({
    message: "success",
    numbers: numbers
  })
}

exports.getReservations =  async (req, res, next) =>{
  const idUser = req.body.username;
  const reservations = await model.Reservation.findAll({
    where:{
      userId: idUser,
      status: {[Op.in]: ['PENDING', 'CONFIRMED', 'CHECKIN',"CHECKOUT"] }
    } 
  });
  if(!reservations) return res.status(200).json({
    message: "success",
    reservations: []
  })
  const mapReservations = reservations.map(async (reservation) => {
    let color;
    const spot = model.Spot.findOne({where: {id: reservation.spotId}, paranoid: false});
    if(reservation.status === 'PENDING') color = '#F59E0B'
    else if(reservation.status === 'CONFIRMED') color = '#10B981'
    else if(reservation.status === 'CHECKIN') color = '#0EA5E9'
    else if(reservation.status === 'CHECKOUNT') color = '#ca4126ff'
    const spotResult = await spot;
    return {
      id: reservation.id,
      dateIn: reservation.dateIn,
      dateOut: reservation.dateOut,
      startBlock: reservation.startBlock,
      blockCount: reservation.blockCount,
      plate: reservation.plate,
      vehicleType: reservation.vehicleType,
      area: spotResult.area || null,
      position: spotResult.position || null,
    }
  })

  return res.status(200).json({
    message: "success",
    reservations: mapReservations
  })
}