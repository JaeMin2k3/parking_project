const {body, validationResult} = require('express-validator');

async function validateUserNamePhone( req, res, next){
  await body('username')
  .isMobilePhone('vi-VN')
  .withMessage('username phải là sdt Việt Nam hợp lệ')
  .run(req);

  const errors = validationResult(req);
  if(!errors.isEmpty()) return res.status(400).json({
    errors: errors.array()
  })
  next();
}

module.exports = validateUserNamePhone;