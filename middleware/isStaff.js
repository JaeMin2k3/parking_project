
require('dotenv').config()
function TokenVerify(req, res, next) {
    const token = req.headers['authorization'] || req.headers['Authorization']
    if (token) {
        require('jsonwebtoken').verify(token, process.env.SECRET_KEY, async (error, decoded) => {
            if (error) {
                res.status(403).send('Invaild token')
                console.error(error)
            } else {
              if(decoded.role === "staff"){
                req.username = decoded.id
                next();
              } 
                
              else
                res.status(403).json('role ko hợp lệ');
            }

        })
    }else res.status(401).send('Unauthorized')
}
module.exports = TokenVerify