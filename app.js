const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sequelize = require('./util/database');

app.use(bodyParser.json());

//import .env
require('dotenv').config(); 
const port = process.env.PORT; 

//import model

const models = require('./models/index');


//import router

const routerAdmin = require('./routers/admin');
const routerUser = require('./routers/user');




// app.use('admin',routerAdmin);
app.use('/user', routerUser);


app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal error' });
});

sequelize.sync().then(result => {
  app.listen(port);
}).catch(err => {
  console.log(err);
});
