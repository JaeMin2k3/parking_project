const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sequelize = require('./util/database');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); // 👈 cần cho form POST của bridge

//import .env
require('dotenv').config(); 
const port = process.env.PORT; 

//import model

const models = require('./models/index');


//import router

const routerAdmin = require('./routers/admin');
const routerUser = require('./routers/user');
const routerStaff = require('./routers/staff')



// app.use('admin',routerAdmin);
app.use('/user', routerUser);
app.use('/admin', routerAdmin);
app.use('/staff', routerStaff);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal error' });
});

sequelize.sync({force: true}).then(result => {
  app.listen(port);
}).catch(err => {
  console.log(err);
});
