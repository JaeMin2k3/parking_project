const model = require('../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.postLogin = async (req, res, next) => {
  const {username, password} = req.body;
  console.log(username + password)
  if(!username || !password) return res.status(400).json({message: 'vui lòng điền đủ username và password'});
  try{
    const user = await model.Customer.findOne(
    {
      where: {username},
      attributes: ['username', "password_hash"],
      raw: true
    })
    console.log(user)
    //check username
    if(user){
    const ok = await bcrypt.compare(password, user.password_hash);
    // check mặt khẩu
    if(ok){
      jwt.sign({_id: user.username}, process.env.SECRET_KEY, {expiresIn: '24h'},
         (err, token) => {
          if(err){
            console.log(err);
            res.status(500).send(err);
          }else {
            res.status(200).json({
              message: "success",
              token: token
            })
          }
         }
      )
    }else{
      res.status(401).send('mật khẩu không đúng');
    }
  }else {
    res.status(401).json("tài khoản không tồn tại")
  }
    
  }catch(err){
    console.log(err);
  }   
}


exports.postSign = async (req, res, next) => {
  const {username, password} = req.body;
  console.log(username + password)
  const user = await model.Customer.findOne({
    where: {username},
    raw: true
  })
  console.log(user)
  if(user) return res.status(409).json({message: "username đã tồn tại"})
  else {
    const pw_hash = bcrypt.hashSync(password, 10);
    const created = await model.Customer.create({
      username: username,
      password_hash: pw_hash,
      role: 'customer',
      status: 1
    });
    res.status(200).json({message: "tạo tài khoản thành công"})
  }
  
}