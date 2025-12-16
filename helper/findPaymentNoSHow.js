const model = require('../models/index');
const {Op} = require('sequelize')
module.exports = async function findPaymentNoSHow(start, end){
  const payments = await model.Reservation.findAll({
    raw: true,
    where: {
      status: 'NOSHOW',
      [Op.or]: [
        // khách đến sớm -> dateIn luôn luôn lớn hơn start ít nhất 1h
        {
          dateIn: {[Op.gte]: start},
          dateOut: {[Op.gte]: end}
        },
        {
          dateIn: {[Op.gte]: start},
          dateOut: {[Op.lte]: end}
        }
      ]
    }
  })
  return payments;
}