const crypto = require('crypto');
const querystring = require('querystring');
const moment = require('moment');

/**
 * Sort object by key
 */
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

/**
 * Create VNPay payment URL
 */
function createPaymentUrl(params) {
  const vnpayConfig = require('../config/vnpay');
  
  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnpayConfig.vnp_TmnCode,
    vnp_Locale: params.language || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.orderId,
    vnp_OrderInfo: params.orderDescription,
    vnp_OrderType: params.orderType || 'other',
    vnp_Amount: params.amount * 100, // VNPay requires amount in smallest unit (VND * 100)
    vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
    vnp_IpAddr: params.ipAddr,
    vnp_CreateDate: moment().format('YYYYMMDDHHmmss'),
    vnp_BankCode: params.bankCode || ''
  };

  // Add expiration time (default: 15 minutes)
  if (params.expireDate) {
    vnp_Params['vnp_ExpireDate'] = params.expireDate;
  } else {
    vnp_Params['vnp_ExpireDate'] = moment().add(15, 'minutes').format('YYYYMMDDHHmmss');
  }

  // Sort parameters
  vnp_Params = sortObject(vnp_Params);

  // Create signature
  let signData = querystring.stringify(vnp_Params, { encode: false });
  let hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  vnp_Params['vnp_SecureHash'] = signed;

  // Create payment URL
  let paymentUrl = vnpayConfig.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

  return paymentUrl;
}

/**
 * Verify VNPay return signature
 */
function verifyReturnUrl(vnpParams) {
  const vnpayConfig = require('../config/vnpay');
  
  let secureHash = vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  vnpParams = sortObject(vnpParams);

  let signData = querystring.stringify(vnpParams, { encode: false });
  let hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === signed;
}

/**
 * Get response code message
 */
function getResponseMessage(responseCode) {
  const messages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
    '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
    '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
    '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Các lỗi khác'
  };

  return messages[responseCode] || 'Lỗi không xác định';
}

module.exports = {
  sortObject,
  createPaymentUrl,
  verifyReturnUrl,
  getResponseMessage
};
