const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sequelize = require('./config/database');
const cors = require('cors');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); 

//import .env
require('dotenv').config(); 
const port = process.env.PORT; 

//import model

const models = require('./models/index');


//import router

const routerAdmin = require('./routers/admin');
const routerUser = require('./routers/user');
const routerStaff = require('./routers/staff');
const routerPayment = require('./routers/payment');

//
app.use('/user', routerUser);
app.use('/admin', routerAdmin);
app.use('/staff', routerStaff);
// app.use('/payment', routerPayment);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal error' });
});

sequelize.sync().then(result => {
  const server = app.listen(port);
  const io = require('./socket').init(server);
  io.on('connection', socket => {
    console.log('Client connected');
  })
 
}).catch(err => {
  console.log(err);
});
