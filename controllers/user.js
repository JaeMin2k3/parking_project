const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
require('dotenv').config();
const crypto = require('crypto');
const { mailer } = require('../config/mailer');
const sequelize = require('../config/database');
const vnpayHelper = require('../helper/vnPay');
const ReservationBlock = require('../models/ReservationBlock');
const isSlotAvailable = require('../helper/isSlotAvailable');
const createBlocksFromReservation = require('../helper/createBlocksFromReservation');
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
  try {
    const { username, password, gmail } = req.body;
    if (!username || !password || !gmail) {
      return res.status(400).json({ message: 'Thiếu username/password/gmail' });
    }
    const email = String(gmail).trim().toLowerCase();

    const existed = await model.Customer.findOne({
      where: { [Op.or]: [{ username: username.trim() }, { gmail: email }] },
      attributes: ['username','gmail'],
      raw: true
    });
    if (existed) return res.status(409).json({ message: 'Username hoặc gmail đã tồn tại' });

    let verifyLink;
    await model.Customer.sequelize.transaction(async (t) => {
      const password_hash = await bcrypt.hash(password, 10);
      const user = await model.Customer.create({
        username: username,
        password_hash,
        gmail: email,
        role: 'customer',
        status: 1,
        verified: false
      }, { transaction: t });

      await model.UserVerify.destroy({ where: { gmailCustomer: email, usedAt: null }, transaction: t });

      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await model.UserVerify.create({ gmailCustomer: email, tokenHash, expiresAt }, { transaction: t });

    
      verifyLink = `${process.env.APP_BASE_URL}/verify-email/${encodeURIComponent(rawToken)}`;
      
      t.afterCommit(async () => {
        await mailer.sendMail({
          to: email,
          from: process.env.MAIL_FROM || process.env.GMAIL_USER,
          subject: 'Xác minh email',
          html: `
            <p>Chào ${user.username},</p>
            <p>Nhấn vào link sau để xác minh email (hết hạn trong 30 phút):</p>
            <p><a href="${verifyLink}">${verifyLink}</a></p>
          `
        });
      });
    });
    return res.status(200).json({ message: 'Tạo tài khoản thành công. Kiểm tra email để xác minh.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};


async function createAndSendVerifyLink(user, t) {
  // Xoá token cũ chưa dùng 
  await model.UserVerify.destroy({ where: { gmail_customer: user.gmail, usedAt: null }, transaction: t });
  console.log(user)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); 

  await model.UserVerify.create({ gmailCustomer: user.gmail, tokenHash, expiresAt }, { transaction: t });

  const link = `${process.env.APP_BASE_URL}/verify-email/${encodeURIComponent(rawToken)}`;

  await mailer.sendMail({
    to: user.gmail,
    subject: 'Xác minh email',
    html: `
      <p>Chào bạn,</p>
      <p>Nhấn để xác minh email:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Nếu không phải bạn, hãy bỏ qua email này.</p>
    `,
  });
}


exports.postResendVerify = async (req, res, next) => {
  try {
    const { gmail } = req.body || {};
    console.log(gmail)
    if (!gmail) return res.status(400).json({ error: 'email is required' });

    const user = await model.Customer.findOne({ where: { gmail: String(gmail).toLowerCase() } });
    console.log(user)
    if (!user) return res.status(404).json({ error: 'User không tồn tại' });
    if (user.verified) return res.status(400).json({ error: 'User đã xác minh' });

    await model.Customer.sequelize.transaction(async (t) => { await createAndSendVerifyLink(user, t); });
    return res.json({ ok: true, message: 'Đã gửi lại email xác minh' });
  } catch (err) { next(err); }
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
  try {
    const raw = String(req.body.token || '');
    if (!raw) return res.status(400).send('Thiếu token');

    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const rec = await model.UserVerify.findOne({ where: { tokenHash: hash } });
    if (!rec) return res.status(400).send('Token không hợp lệ');
    if (rec.usedAt) return res.status(400).send('Token đã được sử dụng');
    if (rec.expiresAt.getTime() < Date.now()) return res.status(400).send('Token đã hết hạn');

    await model.Customer.sequelize.transaction(async (t) => {
      await model.Customer.update(
        { verified: true },
        { where: { gmail: rec.gmailCustomer }, transaction: t }
      );
      await model.UserVerify.update(
        { usedAt: new Date() },
        { where: { id: rec.id }, transaction: t }
      );
      await model.UserVerify.destroy({
        where: { gmailCustomer: rec.gmailCustomer, usedAt: null },
        transaction: t
      });
    });
    return res.send('Xác minh email thành công!');
  } catch (e) {
    return next(e);
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
        <p>Barcode để reset password của bạn là: ${rawToken};
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
  const {timeIn, timeOut, date, vehicleType} = req.body;
  const startBlock = Number(timeIn);
  const endBlock = Number(timeOut) - 1;
 const freeSpots = await model.Spot.findAll({
  attributes: ['id', 'area', 'position', 'isActive', 'vehicleType', 'slotType'],
  where: {
    isActive: true,
    vehicleType: vehicleType,
    slotType: 'ONLINE',
    '$ReservationBlocks.id$': null // chỉ lấy spot không bận 
  },
  include: [
    {
      model: model.ReservationBlock,
      required: false,
      where: {
        date,
        blockIndex: { [Op.between]: [startBlock, endBlock] },
        status: { [Op.in]: ['CONFIRMED', 'PENDING'] }
      }
    }
  ]
});
if(!freeSpots) return res.status(404).json({
  message: "no found",
  freeSpots: [],
})
  return res.status(200).json({
    freeSpots: freeSpots,
    timeIn: timeIn,
    timeOut: timeOut,
    date: date,
    vehicleType: vehicleType
  })
  
}

// /user/reservation
exports.postReservation = async (req, res, next) => {
  const {id, position, area, timeIn, timeOut, date, vehicleType, plate } = req.body;
  const startTime = Number(timeIn);
  const endTime = Number(timeOut);
  const transaction =await sequelize.transaction();
  try {
    const check = await isSlotAvailable(id,date, timeIn, timeOut);
    if(!check){
      await transaction.rollback();
      return res.staus(409).json({message: "thời gian đặt bị trùng"});
    }
    console.log(check);
    const reservation = await model.Reservation.create({
      date: date,
      startBlock: startTime,
      blockCount: endTime - startTime,
      status: 'PENDING',
      channel: 'ONLINE',
      plate: plate,
      vehicleType: vehicleType,
      user_id: req.username,
      spotId: id
    },{transaction})
    console.log(reservation);
    if(!reservation){
      await transaction.rollback();
      return res.status(500).json({message: "lỗi server không thể tạo được reservation"});
    }
    await createBlocksFromReservation(reservation, transaction);
    await transaction.commit();
    return res.status(201).json({ reservation });
  } catch (error) {
    console.log(error)
    await transaction.rollback();
    return res.status(500).json({message: 'lỗi server vui long thử lại sau'})
  }
}