const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sequelize = require('./util/database');

app.use(bodyParser.json());

//import .env
require('dotenv').config(); 
const port = process.env.PORT; 



//import router

const routerAdmin = require('./routers/admin');
const routerUser = require('./routers/user');



app.use('admin',routerAdmin);
app.use('user', routerUser);


sequelize.sync().then(result => {
  console.log(result);
  app.listen(port);
}).catch(err => {
  console.log(err);
});
