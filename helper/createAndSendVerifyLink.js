const model = require('../models/index')
const crypto = require('crypto')
const {mailer} = require('../config/mailer')
module.exports = async function createAndSendVerifyLink(user, t) {
  // Xoá token cũ chưa dùng 
  await model.UserVerify.destroy({ where: { gmailCustomer: user.gmail, usedAt: null }, transaction: t });
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