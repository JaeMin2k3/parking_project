const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sequelize = require('./util/database');

app.use(bodyParser.json());

// app.use('/admin', routerAdmin);
// app.use('/user', routerUser)
// app.use('*', errorRouter.get404);
sequelize.sync().then(result => {
  console.log(result);
  app.listen(8080);
}).catch(err => {
  console.log(err);
});
