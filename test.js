const bcrypt = require('bcrypt');

const admin = "123456";
console.log(bcrypt.hashSync(admin,10));
// tk: admin, mk: $2b$10$8YwWb5C62So8KTPfaj.9MOg3Cdd0oaFja9jEs/GMMxCHfR0iaNxgi