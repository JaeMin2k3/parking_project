const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sequelize = require('./config/database');
const cors = require('cors');
require('dotenv').config();             
const { initCronJobs } = require('./cronJobs');
initCronJobs();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const port = process.env.PORT;

// import model (nếu bạn cần dùng ở đây)
const models = require('./models/index');

// import router
const routerAdmin = require('./routers/admin');
const routerUser  = require('./routers/user');
const routerStaff = require('./routers/staff');


require('./config/vnpay');

// router
app.use('/user',  routerUser);
app.use('/admin', routerAdmin);
app.use('/staff', routerStaff);

const qs = require('querystring');
const crypto = require('crypto');

function formatVnpDate(date = new Date()) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => (sorted[k] = obj[k]));
  return sorted;
}

// TEST ONLY
app.get('/test-vnp', (req, res) => {
  const tmnCode   = (process.env.VNP_TMNCODE || '').trim();
  const secretKey = (process.env.VNP_HASHSECRET || '').trim();
  const vnpUrl    = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = 'http://localhost:8080/payment/vnpay/return';

  const amount    = 10000; // 10k

  const createDate = formatVnpDate(new Date());
  const vnp_TxnRef = 'TEST' + Date.now();

  let vnp_Params = {
    vnp_Version:    '2.1.0',
    vnp_Command:    'pay',
    vnp_TmnCode:    tmnCode,
    vnp_Locale:     'vn',
    vnp_CurrCode:   'VND',
    vnp_TxnRef:     vnp_TxnRef,
    vnp_OrderInfo:  'Thanh toan test',
    vnp_OrderType:  'other',
    vnp_Amount:     amount * 100,
    vnp_ReturnUrl:  returnUrl,
    vnp_IpAddr:     '127.0.0.1',
    vnp_CreateDate: createDate,
  };

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, null, null, { encode: false });
  console.log('TEST signData:', signData);

  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  vnp_Params.vnp_SecureHash = signed;

  const paymentUrl = vnpUrl + '?' + qs.stringify(vnp_Params, null, null, { encode: false });
  console.log('TEST paymentUrl:', paymentUrl);
  console.log('TMN = [' + tmnCode + '], secret length =', secretKey.length);

  res.json({ paymentUrl });
});



app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal error' });
});

sequelize.sync()
  .then(result => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
    const io = require('./socket').init(server);
    io.on('connection', socket => {
      console.log('Client connected');
    });
  })
  .catch(err => {
    console.log(err);
  });
