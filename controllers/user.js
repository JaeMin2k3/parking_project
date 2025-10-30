const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
require('dotenv').config();
const crypto = require('crypto');
const { mailer } = require('../util/mailer');

// user/login
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

      // 🔁 Dùng path param thay vì query string
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

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({ message: 'Tạo tài khoản thành công. Kiểm tra email để xác minh.', verifyLink });
    }
    return res.status(200).json({ message: 'Tạo tài khoản thành công. Kiểm tra email để xác minh.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Lỗi hệ thống' });
  }
};

// // user/available-spots
// exports.getAvailableSpots = async (req, res, next) => {
//   const { spot_type, start_time, end_time } = req.body;

//   // Validate input
//   if (!spot_type || !start_time || !end_time) {
//     return res.status(400).json({ 
//       message: "Vui lòng cung cấp đầy đủ: spot_type, start_time, end_time" 
//     });
//   }

//   if (!['CAR', 'MOTORBIKE'].includes(spot_type)) {
//     return res.status(400).json({ 
//       message: "spot_type phải là CAR hoặc MOTORBIKE" 
//     });
//   }

//   // Validate time range
//   const startDate = new Date(start_time);
//   const endDate = new Date(end_time);
  
//   if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
//     return res.status(400).json({ 
//       message: "Định dạng thời gian không hợp lệ" 
//     });
//   }

//   if (endDate <= startDate) {
//     return res.status(400).json({ 
//       message: "Thời gian kết thúc phải sau thời gian bắt đầu" 
//     });
//   }

//   try {
//     // Find all active spots of the requested type
//     const spots = await model.Spot.findAll({
//       where: {
//         spot_type: spot_type,
//         is_active: true
//       },
//       include: [
//         {
//           model: model.ParkingFee,
//           attributes: ['plan_type', 'unit_price', 'currency', 'vehicle_type']
//         }
//       ]
//     });

//     if (spots.length === 0) {
//       return res.status(404).json({
//         message: "Không tìm thấy chỗ đỗ phù hợp",
//         available_spots: []
//       });
//     }

//     // Get all reservations that conflict with the requested time range
//     const conflictingReservations = await model.Reservation.findAll({
//       where: {
//         status: {
//           [Op.in]: ['PENDING_PAYMENT', 'CONFIRMED']
//         },
//         [Op.or]: [
//           {
//             // Reservation starts during requested period
//             start_time: {
//               [Op.between]: [startDate, endDate]
//             }
//           },
//           {
//             // Reservation ends during requested period
//             end_time: {
//               [Op.between]: [startDate, endDate]
//             }
//           },
//           {
//             // Reservation encompasses the entire requested period
//             [Op.and]: [
//               { start_time: { [Op.lte]: startDate } },
//               { end_time: { [Op.gte]: endDate } }
//             ]
//           }
//         ]
//       },
//       attributes: ['spot_id'],
//       raw: true
//     });

//     // Get list of occupied spot IDs
//     const occupiedSpotIds = conflictingReservations.map(r => r.spot_id);

//     // Filter out occupied spots
//     const availableSpots = spots.filter(spot => !occupiedSpotIds.includes(spot.id));

//     res.status(200).json({
//       message: "success",
//       requested_period: {
//         start_time: startDate,
//         end_time: endDate,
//         spot_type: spot_type
//       },
//       total_spots: spots.length,
//       occupied_spots: occupiedSpotIds.length,
//       available_count: availableSpots.length,
//       available_spots: availableSpots
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ 
//       message: "Lỗi server", 
//       error: err.message 
//     });
//   }
// }



async function createAndSendVerifyLink(user, t) {
  // Xoá token cũ chưa dùng (idempotent)
  await model.UserVerify.destroy({ where: { gmail_customer: user.gmail, usedAt: null }, transaction: t });
  console.log(user)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 phút

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



// 1) Bridge GET: tự động POST token lên API
exports.verifyEmailBridge = (req, res) => {
  const token  = encodeURIComponent(String(req.params.token || ''));
  const action = `${process.env.APP_BASE_URL}/verify-email`; // POST đích

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


// 2) API POST: xử lý verify
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
