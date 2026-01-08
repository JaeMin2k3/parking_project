const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sequelize = require('./config/database');
const cors = require('cors');
require('dotenv').config();             
const { initCronJobs } = require('./cronJobs');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const port = process.env.PORT;

// import model 
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
    initCronJobs();
  })
  .catch(err => {
    console.log(err);
  });
