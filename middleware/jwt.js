
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
                    req.username = decoded.id;
                    next();
                
            }

        })
    }else res.status(401).send('Unauthorized')
}
module.exports = TokenVerify