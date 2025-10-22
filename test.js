const bcrypt = require('bcrypt');

const admin = "123456";
console.log(bcrypt.hashSync(admin,10));