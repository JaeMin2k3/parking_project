const model = require('../models/index');
const {Op} = require('sequelize')
module.exports = async function findPaymentNoSHow(start, end) {
  const reservations = await model.Reservation.findAll({
    raw: true,
    where: {
      status: 'NOSHOW',
      [Op.or]: [
        {
          dateIn: { [Op.gte]: start },
          dateOut: { [Op.gte]: end }
        },
        {
          dateIn: { [Op.gte]: start },
          dateOut: { [Op.lte]: end }
        }
      ]
    },
    include: [{
        model: model.Payment, 
        where: { status: 'SUCCEEDED' }, 
        required: true
    }]
  })
  
  const payments = reservations.map(res => {
    console.log(res['Payment.costParking'])
      return {
          costParking: res['Payment.costParking'], 
          ...res.dataValues
      }
  });

  return payments;
}