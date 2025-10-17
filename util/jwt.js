require('dotenv').config()
function TokenVerify(req, res, next) {
    const token = req.headers['authorization']
    if (token) {
        require('jsonwebtoken').verify(token, process.env.SECRET_KEY, async (error, decoded) => {
            if (error) {
                res.status(403).send('Invaild token')
                console.error(error)
            } else {
                const model = require('../db_model/model')
                req.user = await model.user.findById(decoded._id)
                next()
            }

        })
    }else res.status(401).send('Unauthorized')
}
module.exports = TokenVerify