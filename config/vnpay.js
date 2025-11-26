require('dotenv').config();
const { VNPay, ignoreLogger } = require('vnpay');

const vnpay = new VNPay({
  tmnCode:process.env.VNP_TMNCODE.trim(),
  secureSecret:process.env.VNP_HASHSECRET.trim(),
  vnpayHost: 'https://sandbox.vnpayment.vn', // sau này build production thì đổi
  testMode: true,
  hashAlgorithm: 'SHA512',
  loggerFn: ignoreLogger,
});

module.exports = vnpay;