
require('dotenv').config()
const { where } = require('sequelize')
const model = require('../models/index')
function TokenVerify(req, res, next) {
    const token = req.headers['authorization'] || req.headers['Authorization']
    if (token) {
        require('jsonwebtoken').verify(token, process.env.SECRET_KEY, async (error, decoded) => {
            if (error) {
                res.status(403).send('Invaild token')
                console.error(error)
            } else {
                
                if(decoded.role === "customer"){
                const check = await model.Customer.findOne({where: {
                    username: decoded.id,
                    verified: true
                }})
                if(check){
                    req.username = decoded.id;
                    next();
                }else
                    return res.status(403).json("vui lòng verify tài khoản")
                
              } 
              
              else
                res.status(403).json('role hợp lệ');
            }

        })
    }else res.status(401).send('Unauthorized')
}
module.exports = TokenVerify