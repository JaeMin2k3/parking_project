
const model = require('../models/index')
require('dotenv').config()
function TokenVerify(req, res, next) {
    const token = req.headers['authorization']
    if (token) {
        require('jsonwebtoken').verify(token, process.env.SECRET_KEY, async (error, decoded) => {
            if (error) {
                res.status(403).send('Invaild token')
                console.error(error)
            } else {
                next()
            }

        })
    }else res.status(401).send('Unauthorized')
}
module.exports = TokenVerify